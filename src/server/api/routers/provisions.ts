import { TRPCError } from "@trpc/server";
import { addMonths } from "date-fns";
import type { SQL } from "drizzle-orm";
import { and, desc, eq, gte, inArray, lte, sql, sum } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import type { DbClient } from "../../db/client";
import {
  bank_accounts,
  categories,
  financial_group_members,
  financial_groups,
  provision_audit_logs,
  provision_recurring_rules,
  provision_template_items,
  provision_templates,
  provisions,
  transactions,
  users,
} from "../../db/schema";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { requireUserAndGroup } from "../utils/getUserAndGroup";

type Numericish = string | number | null | undefined;

const monthSchema = z.number().int().min(0).max(11);
const yearSchema = z.number().int().min(2000).max(2100);

const periodSchema = z.object({
  month: monthSchema,
  year: yearSchema,
});

const optionalPeriodSchema = periodSchema.partial();

const projectionSchema = z.object({
  month: monthSchema,
  year: yearSchema,
  monthsAhead: z.number().int().min(1).max(24).default(1),
  categoryIds: z.array(z.string().uuid()).optional(),
  overwrite: z.boolean().optional(),
});

const bulkUpsertSchema = z.object({
  period: periodSchema,
  entries: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        categoryId: z.string().uuid(),
        plannedAmount: z.coerce.number().min(0),
        note: z.string().max(2000).optional(),
      }),
    )
    .min(1),
});

const copySchema = z.object({
  from: periodSchema,
  to: periodSchema,
  categoryIds: z.array(z.string().uuid()).optional(),
  overwrite: z.boolean().optional(),
});

const bulkSetSchema = z.object({
  period: periodSchema,
  categoryIds: z.array(z.string().uuid()).min(1),
  mode: z.enum(["absolute", "relative"]).default("absolute"),
  value: z.coerce.number(),
  noteStrategy: z.enum(["keep", "clear", "replace"]).default("keep").optional(),
  note: z.string().max(2000).optional(),
});

const distributeSchema = z.object({
  period: periodSchema,
  categoryIds: z.array(z.string().uuid()).min(1),
  amount: z.coerce.number(),
  strategy: z.enum(["equal", "historical"]).default("equal"),
});

const templateUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().max(400).optional(),
  period: periodSchema,
  categoryIds: z.array(z.string().uuid()).optional(),
});

const applyTemplateSchema = z.object({
  templateId: z.string().uuid(),
  target: periodSchema,
  overwrite: z.boolean().optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
});

const importCsvSchema = z.object({
  rows: z
    .array(
      z.object({
        categoryId: z.string().uuid().optional(),
        categoryName: z.string().optional(),
        month: monthSchema,
        year: yearSchema,
        plannedAmount: z.coerce.number(),
        note: z.string().optional(),
      }),
    )
    .min(1),
  overwrite: z.boolean().optional(),
});

const recurringRuleSchema = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid(),
  plannedAmount: z.coerce.number().min(0),
  startMonth: monthSchema,
  startYear: yearSchema,
  endMonth: monthSchema.optional(),
  endYear: yearSchema.optional(),
  applyAutomatically: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

const suggestionsSchema = z.object({
  period: periodSchema,
  months: z.number().int().min(1).max(12).default(3),
  categoryIds: z.array(z.string().uuid()).optional(),
  type: z.enum(["expense", "income", "all"]).default("all"),
});

const historySchema = z.object({
  period: periodSchema.optional(),
  categoryId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(40),
});

const toNumber = (value: Numericish) => {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toMoneyString = (value: number) => value.toFixed(2);

const resolvePeriod = (input?: { month?: number; year?: number }) => {
  const now = new Date();
  const month = input?.month ?? now.getMonth();
  const year = input?.year ?? now.getFullYear();

  return { month, year };
};

const createMonthRange = (month: number, year: number) => {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

  return { start, end };
};

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
});

const formatMonthLabel = (month: number, year: number) => {
  const reference = new Date(year, month, 1);
  const label = monthFormatter.format(reference);
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} — ${year}`;
};

const recordAuditLog = async (
  db: InsertExecutor,
  params: {
    groupId: string;
    userId: string;
    categoryId: string;
    month: number;
    year: number;
    action: string;
    previousAmount?: number | null;
    newAmount?: number | null;
    context?: Record<string, unknown>;
  },
) => {
  await db.insert(provision_audit_logs).values({
    id: uuidv4(),
    group_id: params.groupId,
    user_id: params.userId,
    category_id: params.categoryId,
    month: params.month,
    year: params.year,
    action: params.action,
    previous_amount:
      params.previousAmount === undefined || params.previousAmount === null
        ? null
        : toMoneyString(params.previousAmount),
    new_amount:
      params.newAmount === undefined || params.newAmount === null
        ? null
        : toMoneyString(params.newAmount),
    context: params.context ?? {},
  });
};

const computeDifference = (planned: number, realized: number) =>
  Number((planned - realized).toFixed(2));

const normalizePlannedInput = (value: number) =>
  Number(Number.isFinite(value) ? value : 0);

type CategoryDictionary = Map<
  string,
  typeof categories.$inferSelect & {
    path: string[];
    depth: number;
  }
>;

const buildCategoryDictionary = (
  rows: (typeof categories.$inferSelect)[],
): CategoryDictionary => {
  const byId = new Map<string, typeof categories.$inferSelect>();
  const children = new Map<string | null, string[]>();

  for (const row of rows) {
    byId.set(row.id, row);
    const parentKey = row.parent_id ?? null;
    if (!children.has(parentKey)) {
      children.set(parentKey, []);
    }
    children.get(parentKey)?.push(row.id);
  }

  const dictionary: CategoryDictionary = new Map();

  const traverse = (id: string, ancestors: string[]) => {
    const node = byId.get(id);
    if (!node) {
      return;
    }
    const path = [...ancestors, node.name];
    const depth = ancestors.length;
    dictionary.set(id, { ...node, path, depth });
    const childIds = children.get(id) ?? [];
    const sortedChildIds = [...childIds].sort((a, b) => {
      const nameA = byId.get(a)?.name ?? "";
      const nameB = byId.get(b)?.name ?? "";
      return nameA.localeCompare(nameB, "pt-BR", { sensitivity: "base" });
    });
    for (const childId of sortedChildIds) {
      traverse(childId, path);
    }
  };

  const rootIds = children.get(null) ?? [];
  const sortedRootIds = [...rootIds].sort((a, b) => {
    const nameA = byId.get(a)?.name ?? "";
    const nameB = byId.get(b)?.name ?? "";
    return nameA.localeCompare(nameB, "pt-BR", { sensitivity: "base" });
  });
  for (const rootId of sortedRootIds) {
    traverse(rootId, []);
  }

  return dictionary;
};

const flattenHierarchy = <
  TNode extends { id: string; parentId: string | null },
>(
  nodes: Map<
    string,
    TNode & {
      children: string[];
    }
  >,
): TNode[] => {
  const result: TNode[] = [];
  const childrenByParent = new Map<string | null, string[]>();
  for (const value of nodes.values()) {
    const parentKey = value.parentId ?? null;
    if (!childrenByParent.has(parentKey)) {
      childrenByParent.set(parentKey, []);
    }
    childrenByParent.get(parentKey)?.push(value.id);
  }

  const walk = (id: string) => {
    const node = nodes.get(id);
    if (!node) {
      return;
    }
    result.push(node);
    const children = childrenByParent.get(id) ?? [];
    for (const childId of children) {
      walk(childId);
    }
  };

  const rootIds = childrenByParent.get(null) ?? [];
  for (const id of rootIds) {
    walk(id);
  }

  return result;
};

const calculateTotals = (
  rows: Array<{
    planned: number;
    realized: number;
  }>,
) => {
  const plannedTotal = rows.reduce((acc, row) => acc + row.planned, 0);
  const realizedTotal = rows.reduce((acc, row) => acc + row.realized, 0);
  const differenceTotal = plannedTotal - realizedTotal;
  const usage = plannedTotal === 0 ? 0 : (realizedTotal / plannedTotal) * 100;

  return {
    plannedTotal: Number(plannedTotal.toFixed(2)),
    realizedTotal: Number(realizedTotal.toFixed(2)),
    differenceTotal: Number(differenceTotal.toFixed(2)),
    usage: Number(usage.toFixed(2)),
  };
};

const buildPeriodKey = (month: number, year: number) => `${year}-${month}`;

const parseCsvValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === "number") {
    return value;
  }

  return Number.parseFloat(value.replace(/\./g, "").replace(",", ".").trim());
};

const ensureCategoryIds = (dictionary: CategoryDictionary, ids?: string[]) => {
  if (!ids?.length) {
    return Array.from(dictionary.keys());
  }
  return ids.filter((id) => dictionary.has(id));
};

const ensureNote = (note?: string | null) => {
  if (!note) {
    return null;
  }
  const trimmed = note.trim();
  return trimmed.length ? trimmed : null;
};

type CopyPeriodParams = {
  db: DbClient;
  groupId: string;
  user: typeof users.$inferSelect;
  dictionary: CategoryDictionary;
  from: { month: number; year: number };
  to: { month: number; year: number };
  categoryIds?: string[];
  overwrite?: boolean;
};

type InsertExecutor = {
  insert: DbClient["insert"];
};

const copyToTargetPeriod = async ({
  db,
  groupId,
  user,
  dictionary,
  from,
  to,
  categoryIds,
  overwrite,
}: CopyPeriodParams) => {
  const allowedCategories = ensureCategoryIds(dictionary, categoryIds);

  if (!allowedCategories.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Nenhuma categoria válida encontrada para copiar.",
    });
  }

  const sourceRows = await db.query.provisions.findMany({
    where: and(
      eq(provisions.group_id, groupId),
      eq(provisions.month, from.month),
      eq(provisions.year, from.year),
      inArray(provisions.category_id, allowedCategories),
    ),
  });

  if (!sourceRows.length) {
    return { inserted: 0, updated: 0 };
  }

  let inserted = 0;
  let updated = 0;

  await db.transaction(async (tx) => {
    for (const source of sourceRows) {
      const plannedAmount = toNumber(source.planned_amount);
      const note = source.note ?? null;

      const existing = await tx.query.provisions.findFirst({
        where: and(
          eq(provisions.group_id, groupId),
          eq(provisions.category_id, source.category_id),
          eq(provisions.month, to.month),
          eq(provisions.year, to.year),
        ),
      });

      if (!existing) {
        await tx.insert(provisions).values({
          id: uuidv4(),
          group_id: groupId,
          category_id: source.category_id,
          month: to.month,
          year: to.year,
          planned_amount: toMoneyString(plannedAmount),
          note,
        });

        await recordAuditLog(tx, {
          groupId,
          userId: user.id,
          categoryId: source.category_id,
          month: to.month,
          year: to.year,
          action: "copy_create",
          newAmount: plannedAmount,
          context: {
            fromMonth: from.month,
            fromYear: from.year,
          },
        });

        inserted += 1;
        continue;
      }

      if (!overwrite) {
        continue;
      }

      await tx
        .update(provisions)
        .set({
          planned_amount: toMoneyString(plannedAmount),
          note,
          updated_at: new Date(),
        })
        .where(eq(provisions.id, existing.id));

      await recordAuditLog(tx, {
        groupId,
        userId: user.id,
        categoryId: source.category_id,
        month: to.month,
        year: to.year,
        action: "copy_update",
        previousAmount: toNumber(existing.planned_amount),
        newAmount: plannedAmount,
        context: {
          fromMonth: from.month,
          fromYear: from.year,
        },
      });

      updated += 1;
    }
  });

  return { inserted, updated };
};

export const provisionsRouter = createTRPCRouter({
  importDefaultCategories: protectedProcedure.mutation(async ({ ctx }) => {
    const { db, userId } = ctx;
    const { groupId } = await requireUserAndGroup(db, userId);

    const categoriesList = await db.query.categories.findMany({
      where: eq(categories.group_id, groupId),
    });

    if (!categoriesList.length) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Nenhuma categoria encontrada.",
      });
    }

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const inserted = await db
      .insert(provisions)
      .values(
        categoriesList.map((cat) => ({
          id: uuidv4(),
          group_id: groupId,
          category_id: cat.id,
          month,
          year,
          planned_amount: toMoneyString(0),
          note: null,
          updated_at: new Date(),
        })),
      )
      .onConflictDoNothing({
        target: [
          provisions.group_id,
          provisions.category_id,
          provisions.month,
          provisions.year,
        ],
      })
      .returning({ id: provisions.id });

    return { inserted: inserted.length, month, year };
  }),
  context: protectedProcedure
    .input(optionalPeriodSchema.optional())
    .query(async ({ ctx, input }) => {
      const { db, userId } = ctx;
      const { groupId, user } = await requireUserAndGroup(db, userId);
      const period = resolvePeriod(input ?? undefined);

      const group = await db.query.financial_groups.findFirst({
        where: eq(financial_groups.id, groupId),
        columns: {
          id: true,
          name: true,
          created_at: true,
        },
      });

      const distinctPeriods = await db
        .selectDistinct({
          month: provisions.month,
          year: provisions.year,
        })
        .from(provisions)
        .where(eq(provisions.group_id, groupId))
        .orderBy(provisions.year, provisions.month);

      const periods = distinctPeriods.map((item) => ({
        month: item.month,
        year: item.year,
        label: formatMonthLabel(item.month, item.year),
        key: buildPeriodKey(item.month, item.year),
      }));

      const currentLabel = formatMonthLabel(period.month, period.year);

      return {
        group: {
          id: group?.id ?? groupId,
          name: group?.name ?? "Meu grupo financeiro",
          memberName: user.name,
          createdAt: group?.created_at?.toISOString() ?? null,
        },
        period: {
          ...period,
          label: currentLabel,
        },
        availablePeriods: periods,
      };
    }),

  metrics: protectedProcedure
    .input(periodSchema.optional())
    .query(async ({ ctx, input }) => {
      const { db, userId } = ctx;
      const { groupId } = await requireUserAndGroup(db, userId);
      const period = resolvePeriod(input ?? undefined);
      const { start, end } = createMonthRange(period.month, period.year);

      const [plannedRow, realizedRow, overBudgetRow] = await Promise.all([
        db
          .select({ total: sum(provisions.planned_amount) })
          .from(provisions)
          .where(
            and(
              eq(provisions.group_id, groupId),
              eq(provisions.month, period.month),
              eq(provisions.year, period.year),
            ),
          )
          .limit(1)
          .then((rows) => rows[0]),
        db
          .select({ total: sum(transactions.amount) })
          .from(transactions)
          .where(
            and(
              eq(transactions.group_id, groupId),
              eq(transactions.is_paid, true),
              gte(transactions.date, start),
              lte(transactions.date, end),
            ),
          )
          .limit(1)
          .then((rows) => rows[0]),
        db
          .select({
            total: sum(transactions.amount),
          })
          .from(transactions)
          .innerJoin(
            provisions,
            and(
              eq(provisions.group_id, groupId),
              eq(provisions.category_id, transactions.category_id),
              eq(provisions.month, period.month),
              eq(provisions.year, period.year),
            ),
          )
          .where(
            and(
              eq(transactions.group_id, groupId),
              eq(transactions.is_paid, true),
              gte(transactions.date, start),
              lte(transactions.date, end),
            ),
          )
          .limit(1)
          .then((rows) => rows[0]),
      ]);

      const plannedTotal = toNumber(plannedRow?.total);
      const realizedTotal = toNumber(realizedRow?.total);
      const overBudgetTotal = toNumber(overBudgetRow?.total);
      const remainingTotal = plannedTotal - realizedTotal;
      const coverage =
        plannedTotal === 0 ? 0 : (realizedTotal / plannedTotal) * 100;

      return {
        month: period.month,
        year: period.year,
        label: formatMonthLabel(period.month, period.year),
        plannedTotal,
        realizedTotal,
        remainingTotal,
        coverage,
        overBudgetTotal,
      };
    }),

  grid: protectedProcedure
    .input(
      z
        .object({
          period: periodSchema,
          includeInactive: z.boolean().optional(),
          type: z.enum(["all", "expense", "income"]).default("all"),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { db, userId } = ctx;
      const { groupId } = await requireUserAndGroup(db, userId);
      const period = resolvePeriod(input?.period);
      const { start, end } = createMonthRange(period.month, period.year);

      const categoryFilters = [eq(categories.group_id, groupId)];
      if (!input?.includeInactive) {
        categoryFilters.push(eq(categories.is_active, true));
      }
      if (input?.type && input.type !== "all") {
        categoryFilters.push(eq(categories.type, input.type));
      }

      const categoriesRows = await db.query.categories.findMany({
        where:
          categoryFilters.length === 1
            ? categoryFilters[0]
            : and(...categoryFilters),
      });

      const dictionary = buildCategoryDictionary(categoriesRows);

      if (!dictionary.size) {
        return {
          rows: [],
          totals: {
            plannedTotal: 0,
            realizedTotal: 0,
            differenceTotal: 0,
            usage: 0,
          },
        };
      }

      const categoryIds = Array.from(dictionary.keys());

      const [provisionRows, realizedRows] = await Promise.all([
        db
          .select({
            id: provisions.id,
            categoryId: provisions.category_id,
            plannedAmount: provisions.planned_amount,
            note: provisions.note,
            updatedAt: provisions.updated_at,
          })
          .from(provisions)
          .where(
            and(
              eq(provisions.group_id, groupId),
              eq(provisions.month, period.month),
              eq(provisions.year, period.year),
              inArray(provisions.category_id, categoryIds),
            ),
          ),
        db
          .select({
            categoryId: transactions.category_id,
            amount: sum(transactions.amount),
            type: transactions.type,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.group_id, groupId),
              eq(transactions.is_paid, true),
              gte(transactions.date, start),
              lte(transactions.date, end),
              inArray(transactions.category_id, categoryIds),
            ),
          )
          .groupBy(transactions.category_id, transactions.type),
      ]);

      const plannedMap = new Map<
        string,
        {
          id: string;
          amount: number;
          note: string | null;
          updatedAt: Date | null;
        }
      >();

      provisionRows.forEach((row) => {
        plannedMap.set(row.categoryId, {
          id: row.id,
          amount: toNumber(row.plannedAmount),
          note: row.note ?? null,
          updatedAt: row.updatedAt ?? null,
        });
      });

      const realizedMap = new Map<
        string,
        {
          expense: number;
          income: number;
        }
      >();

      realizedRows.forEach((row) => {
        if (!row.categoryId) {
          return;
        }
        const bucket = realizedMap.get(row.categoryId) ?? {
          expense: 0,
          income: 0,
        };
        if (row.type === "income") {
          bucket.income += toNumber(row.amount);
        } else if (row.type === "expense") {
          bucket.expense += toNumber(row.amount);
        }
        realizedMap.set(row.categoryId, bucket);
      });

      type RowNode = {
        id: string;
        parentId: string | null;
        categoryId: string;
        name: string;
        type: "expense" | "income";
        isActive: boolean;
        depth: number;
        path: string[];
        planned: number;
        realized: number;
        difference: number;
        provisionId: string | null;
        note: string | null;
        updatedAt: string | null;
        hasChildren: boolean;
        children: string[];
        color: string;
      };

      const nodes = new Map<string, RowNode>();

      dictionary.forEach((category, id) => {
        const planData = plannedMap.get(id);
        const realizedData = realizedMap.get(id);
        const realizedAmount =
          category.type === "income"
            ? (realizedData?.income ?? 0)
            : (realizedData?.expense ?? 0);

        nodes.set(id, {
          id,
          parentId: category.parent_id ?? null,
          categoryId: id,
          name: category.name,
          type: category.type,
          isActive: category.is_active,
          depth: category.depth,
          path: category.path,
          planned: planData?.amount ?? 0,
          realized: realizedAmount,
          difference: computeDifference(planData?.amount ?? 0, realizedAmount),
          provisionId: planData?.id ?? null,
          note: planData?.note ?? null,
          updatedAt: planData?.updatedAt?.toISOString() ?? null,
          hasChildren: false,
          children: [],
          color: category.color,
        });
      });

      nodes.forEach((node) => {
        if (node.parentId) {
          const parent = nodes.get(node.parentId);
          if (parent) {
            parent.hasChildren = true;
            parent.children.push(node.id);
          }
        }
      });

      // aggregate parents
      const aggregateTotals = (
        id: string,
      ): {
        planned: number;
        realized: number;
      } => {
        const node = nodes.get(id);
        if (!node) {
          return { planned: 0, realized: 0 };
        }
        if (!node.children.length) {
          return {
            planned: node.planned,
            realized: node.realized,
          };
        }
        let planned = node.planned;
        let realized = node.realized;
        node.children.forEach((childId) => {
          const totals = aggregateTotals(childId);
          planned += totals.planned;
          realized += totals.realized;
        });
        node.planned = Number(planned.toFixed(2));
        node.realized = Number(realized.toFixed(2));
        node.difference = computeDifference(node.planned, node.realized);
        return { planned: node.planned, realized: node.realized };
      };

      const rootIds = Array.from(nodes.values())
        .filter((node) => node.parentId === null)
        .map((node) => node.id);
      rootIds.forEach((rootId) => {
        aggregateTotals(rootId);
      });

      const ordered = flattenHierarchy(nodes);

      const totals = calculateTotals(ordered);

      return {
        rows: ordered.map(({ children, ...row }) => ({
          ...row,
          key: `${row.categoryId}-${period.year}-${period.month}`,
          isEditable: !row.hasChildren,
        })),
        totals,
      };
    }),

  suggestions: protectedProcedure
    .input(suggestionsSchema)
    .query(async ({ ctx, input }) => {
      const { db, userId } = ctx;
      const { groupId } = await requireUserAndGroup(db, userId);
      const period = input.period;
      const baseDate = new Date(period.year, period.month, 1);
      const startDate = addMonths(baseDate, -input.months);
      const endDate = new Date(
        period.year,
        period.month + 1,
        0,
        23,
        59,
        59,
        999,
      );

      const categoryRows = await db.query.categories.findMany({
        where: eq(categories.group_id, groupId),
      });
      const dictionary = buildCategoryDictionary(categoryRows);
      const categoryIds = ensureCategoryIds(dictionary, input.categoryIds);

      if (!categoryIds.length) {
        return [];
      }

      const rows = await db
        .select({
          categoryId: transactions.category_id,
          total: sum(transactions.amount),
          months: sql<number>`count(distinct date_trunc('month', ${transactions.date}))`,
          type: transactions.type,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.group_id, groupId),
            eq(transactions.is_paid, true),
            gte(transactions.date, startDate),
            lte(transactions.date, endDate),
            inArray(transactions.category_id, categoryIds),
          ),
        )
        .groupBy(transactions.category_id, transactions.type);

      return rows
        .map((row) => {
          if (!row.categoryId) {
            return null;
          }
          const category = dictionary.get(row.categoryId);
          if (!category) {
            return null;
          }
          if (input.type !== "all" && category.type !== input.type) {
            return null;
          }
          if (category.type === "expense" && row.type !== "expense") {
            return null;
          }
          if (category.type === "income" && row.type !== "income") {
            return null;
          }
          const average =
            row.months && row.months > 0 ? toNumber(row.total) / row.months : 0;
          return {
            categoryId: row.categoryId,
            name: category.name,
            path: category.path,
            type: category.type,
            suggestedAmount: Number(average.toFixed(2)),
          };
        })
        .filter(Boolean);
    }),

  bulkUpsert: protectedProcedure
    .input(bulkUpsertSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;
      const { groupId, user } = await requireUserAndGroup(db, userId);
      const period = input.period;

      const categoryRows = await db.query.categories.findMany({
        where: eq(categories.group_id, groupId),
      });
      const dictionary = buildCategoryDictionary(categoryRows);

      const entries = input.entries.filter((entry) =>
        dictionary.has(entry.categoryId),
      );

      if (!entries.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nenhuma categoria válida encontrada.",
        });
      }

      const updated: Array<{
        categoryId: string;
        plannedAmount: number;
        note: string | null;
      }> = [];

      await db.transaction(async (tx) => {
        for (const entry of entries) {
          const plannedAmount = normalizePlannedInput(entry.plannedAmount);
          const note = ensureNote(entry.note);
          const existing = await tx.query.provisions.findFirst({
            where: and(
              eq(provisions.group_id, groupId),
              eq(provisions.category_id, entry.categoryId),
              eq(provisions.month, period.month),
              eq(provisions.year, period.year),
            ),
          });

          if (existing) {
            await tx
              .update(provisions)
              .set({
                planned_amount: toMoneyString(plannedAmount),
                note,
                updated_at: new Date(),
              })
              .where(eq(provisions.id, existing.id));

            await recordAuditLog(tx, {
              groupId,
              userId: user.id,
              categoryId: entry.categoryId,
              month: period.month,
              year: period.year,
              action: "update",
              previousAmount: toNumber(existing.planned_amount),
              newAmount: plannedAmount,
              context: note ? { note } : undefined,
            });

            updated.push({
              categoryId: entry.categoryId,
              plannedAmount,
              note,
            });
            continue;
          }

          await tx.insert(provisions).values({
            id: uuidv4(),
            group_id: groupId,
            category_id: entry.categoryId,
            month: period.month,
            year: period.year,
            planned_amount: toMoneyString(plannedAmount),
            note,
          });

          await recordAuditLog(tx, {
            groupId,
            userId: user.id,
            categoryId: entry.categoryId,
            month: period.month,
            year: period.year,
            action: "create",
            newAmount: plannedAmount,
            context: note ? { note } : undefined,
          });

          updated.push({
            categoryId: entry.categoryId,
            plannedAmount,
            note,
          });
        }
      });

      return {
        updated,
        count: updated.length,
      };
    }),

  copyFromPrevious: protectedProcedure
    .input(copySchema)
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;
      const { groupId, user } = await requireUserAndGroup(db, userId);

      const categoryRows = await db.query.categories.findMany({
        where: eq(categories.group_id, groupId),
      });
      const dictionary = buildCategoryDictionary(categoryRows);
      return copyToTargetPeriod({
        db,
        groupId,
        user,
        dictionary,
        from: input.from,
        to: input.to,
        categoryIds: input.categoryIds,
        overwrite: input.overwrite,
      });
    }),

  applyToNextMonths: protectedProcedure
    .input(projectionSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;
      const { groupId, user } = await requireUserAndGroup(db, userId);
      const categoryRows = await db.query.categories.findMany({
        where: eq(categories.group_id, groupId),
      });
      const dictionary = buildCategoryDictionary(categoryRows);

      let totalInserted = 0;
      let totalUpdated = 0;

      for (let i = 1; i <= input.monthsAhead; i += 1) {
        const targetDate = addMonths(new Date(input.year, input.month, 1), i);
        const response = await copyToTargetPeriod({
          db,
          groupId,
          user,
          dictionary,
          from: { month: input.month, year: input.year },
          to: {
            month: targetDate.getMonth(),
            year: targetDate.getFullYear(),
          },
          categoryIds: input.categoryIds,
          overwrite: input.overwrite,
        });
        totalInserted += response.inserted;
        totalUpdated += response.updated;
      }

      return { inserted: totalInserted, updated: totalUpdated };
    }),

  applyToNextMonthsRecursive: protectedProcedure
    .input(
      z.object({
        month: monthSchema,
        year: yearSchema,
        monthsAhead: z.number().int().min(1).max(12).default(12),
        overwrite: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;
      const { groupId, user } = await requireUserAndGroup(db, userId);
      const categoryRows = await db.query.categories.findMany({
        where: eq(categories.group_id, groupId),
      });
      const dictionary = buildCategoryDictionary(categoryRows);

      let totalInserted = 0;
      let totalUpdated = 0;
      let sourceMonth = input.month;
      let sourceYear = input.year;

      for (let i = 0; i < input.monthsAhead; i += 1) {
        const targetDate = addMonths(new Date(sourceYear, sourceMonth, 1), 1);
        const response = await copyToTargetPeriod({
          db,
          groupId,
          user,
          dictionary,
          from: { month: sourceMonth, year: sourceYear },
          to: {
            month: targetDate.getMonth(),
            year: targetDate.getFullYear(),
          },
          overwrite: input.overwrite,
        });

        totalInserted += response.inserted;
        totalUpdated += response.updated;

        sourceMonth = targetDate.getMonth();
        sourceYear = targetDate.getFullYear();
      }

      return { inserted: totalInserted, updated: totalUpdated };
    }),

  bulkSetValue: protectedProcedure
    .input(bulkSetSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;
      const { groupId, user } = await requireUserAndGroup(db, userId);
      const period = input.period;

      const categoryRows = await db.query.categories.findMany({
        where: eq(categories.group_id, groupId),
      });
      const dictionary = buildCategoryDictionary(categoryRows);
      const allowed = ensureCategoryIds(dictionary, input.categoryIds);

      if (!allowed.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nenhuma categoria válida para atualizar.",
        });
      }

      const existingRows = await db.query.provisions.findMany({
        where: and(
          eq(provisions.group_id, groupId),
          eq(provisions.month, period.month),
          eq(provisions.year, period.year),
          inArray(provisions.category_id, allowed),
        ),
      });

      const existingMap = new Map(
        existingRows.map((row) => [row.category_id, row]),
      );

      const updates: Array<{
        categoryId: string;
        plannedAmount: number;
        note: string | null;
      }> = [];

      await db.transaction(async (tx) => {
        for (const categoryId of allowed) {
          const existing = existingMap.get(categoryId);
          const originalAmount = existing
            ? toNumber(existing.planned_amount)
            : 0;
          const value =
            input.mode === "absolute"
              ? input.value
              : originalAmount * (input.value / 100);
          const plannedAmount = Number(value.toFixed(2));
          const note =
            input.noteStrategy === "replace"
              ? ensureNote(input.note)
              : input.noteStrategy === "clear"
                ? null
                : (existing?.note ?? null);

          if (existing) {
            await tx
              .update(provisions)
              .set({
                planned_amount: toMoneyString(plannedAmount),
                note,
                updated_at: new Date(),
              })
              .where(eq(provisions.id, existing.id));

            await recordAuditLog(tx, {
              groupId,
              userId: user.id,
              categoryId,
              month: period.month,
              year: period.year,
              action: "bulk_set",
              previousAmount: originalAmount,
              newAmount: plannedAmount,
              context: {
                mode: input.mode,
              },
            });
          } else {
            await tx.insert(provisions).values({
              id: uuidv4(),
              group_id: groupId,
              category_id: categoryId,
              month: period.month,
              year: period.year,
              planned_amount: toMoneyString(plannedAmount),
              note,
            });

            await recordAuditLog(tx, {
              groupId,
              userId: user.id,
              categoryId,
              month: period.month,
              year: period.year,
              action: "bulk_set_create",
              newAmount: plannedAmount,
              context: {
                mode: input.mode,
              },
            });
          }

          updates.push({
            categoryId,
            plannedAmount,
            note,
          });
        }
      });

      return {
        updated: updates,
        count: updates.length,
      };
    }),

  bulkDistribute: protectedProcedure
    .input(distributeSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;
      const { groupId, user } = await requireUserAndGroup(db, userId);
      const period = input.period;

      const categoryRows = await db.query.categories.findMany({
        where: eq(categories.group_id, groupId),
      });
      const dictionary = buildCategoryDictionary(categoryRows);
      const allowed = ensureCategoryIds(dictionary, input.categoryIds);

      if (!allowed.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nenhuma categoria válida para distribuir.",
        });
      }

      let weights: Map<string, number>;

      if (input.strategy === "historical") {
        const { start, end } = createMonthRange(period.month, period.year);
        const rows = await db
          .select({
            categoryId: transactions.category_id,
            amount: sum(transactions.amount),
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.group_id, groupId),
              eq(transactions.is_paid, true),
              gte(transactions.date, addMonths(start, -3)),
              lte(transactions.date, end),
              inArray(transactions.category_id, allowed),
            ),
          )
          .groupBy(transactions.category_id);

        weights = new Map(
          rows.map((row) => [row.categoryId ?? "", toNumber(row.amount)]),
        );
      } else {
        weights = new Map(allowed.map((id) => [id, 1]));
      }

      const totalWeight = Array.from(weights.values()).reduce(
        (acc, value) => acc + value,
        0,
      );

      if (totalWeight === 0) {
        const equalValue = Number((input.amount / allowed.length).toFixed(2));
        weights = new Map(allowed.map((id) => [id, equalValue]));
      }

      const distribution = new Map<string, number>();
      let allocated = 0;

      allowed.forEach((categoryId, index) => {
        const weight = weights.get(categoryId) ?? 0;
        const amount =
          totalWeight === 0
            ? input.amount / allowed.length
            : (weight / totalWeight) * input.amount;
        const rounded =
          index === allowed.length - 1
            ? Number((input.amount - allocated).toFixed(2))
            : Number(amount.toFixed(2));
        allocated += rounded;
        distribution.set(categoryId, rounded);
      });

      const existingRows = await db.query.provisions.findMany({
        where: and(
          eq(provisions.group_id, groupId),
          eq(provisions.month, period.month),
          eq(provisions.year, period.year),
          inArray(provisions.category_id, allowed),
        ),
      });

      const existingMap = new Map(
        existingRows.map((row) => [row.category_id, row]),
      );

      const updates: Array<{
        categoryId: string;
        plannedAmount: number;
        note: string | null;
      }> = [];

      await db.transaction(async (tx) => {
        for (const [categoryId, plannedAmount] of distribution.entries()) {
          const existing = existingMap.get(categoryId);
          if (existing) {
            await tx
              .update(provisions)
              .set({
                planned_amount: toMoneyString(plannedAmount),
                updated_at: new Date(),
              })
              .where(eq(provisions.id, existing.id));

            await recordAuditLog(tx, {
              groupId,
              userId: user.id,
              categoryId,
              month: period.month,
              year: period.year,
              action: "bulk_distribute",
              previousAmount: toNumber(existing.planned_amount),
              newAmount: plannedAmount,
              context: {
                strategy: input.strategy,
              },
            });
          } else {
            await tx.insert(provisions).values({
              id: uuidv4(),
              group_id: groupId,
              category_id: categoryId,
              month: period.month,
              year: period.year,
              planned_amount: toMoneyString(plannedAmount),
            });

            await recordAuditLog(tx, {
              groupId,
              userId: user.id,
              categoryId,
              month: period.month,
              year: period.year,
              action: "bulk_distribute_create",
              newAmount: plannedAmount,
              context: {
                strategy: input.strategy,
              },
            });
          }

          updates.push({
            categoryId,
            plannedAmount,
            note: existing?.note ?? null,
          });
        }
      });

      return {
        updated: updates,
        count: updates.length,
      };
    }),

  listTemplates: protectedProcedure.query(async ({ ctx }) => {
    const { db, userId } = ctx;
    const { groupId } = await requireUserAndGroup(db, userId);

    const templates = await db.query.provision_templates.findMany({
      where: eq(provision_templates.group_id, groupId),
      orderBy: (template, { desc }) => desc(template.created_at),
    });

    if (!templates.length) {
      return [];
    }

    const items = await db.query.provision_template_items.findMany({
      where: inArray(
        provision_template_items.template_id,
        templates.map((template) => template.id),
      ),
    });

    const grouped = new Map(
      templates.map((template) => [
        template.id,
        { ...template, items: [] as typeof items },
      ]),
    );

    items.forEach((item) => {
      const template = grouped.get(item.template_id);
      if (template) {
        template.items.push(item);
      }
    });

    return Array.from(grouped.values()).map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      createdAt: template.created_at?.toISOString() ?? null,
      items: template.items.map((item) => ({
        categoryId: item.category_id,
        plannedAmount: toNumber(item.planned_amount),
      })),
    }));
  }),

  upsertTemplate: protectedProcedure
    .input(templateUpsertSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;
      const { groupId, user } = await requireUserAndGroup(db, userId);

      const categoryRows = await db.query.categories.findMany({
        where: eq(categories.group_id, groupId),
      });
      const dictionary = buildCategoryDictionary(categoryRows);
      const categoryIds = ensureCategoryIds(dictionary, input.categoryIds);

      if (!categoryIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Selecione pelo menos uma categoria para salvar o template.",
        });
      }

      const provisionRows = await db.query.provisions.findMany({
        where: and(
          eq(provisions.group_id, groupId),
          eq(provisions.month, input.period.month),
          eq(provisions.year, input.period.year),
          inArray(provisions.category_id, categoryIds),
        ),
      });

      if (!provisionRows.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não há provisões cadastradas no período para salvar.",
        });
      }

      const templateId = input.id ?? uuidv4();

      await db.transaction(async (tx) => {
        if (input.id) {
          await tx
            .update(provision_templates)
            .set({
              name: input.name,
              description: input.description,
            })
            .where(eq(provision_templates.id, input.id));

          await tx
            .delete(provision_template_items)
            .where(eq(provision_template_items.template_id, input.id));
        } else {
          await tx.insert(provision_templates).values({
            id: templateId,
            group_id: groupId,
            name: input.name,
            description: input.description,
            created_by: user.id,
          });
        }

        await tx.insert(provision_template_items).values(
          provisionRows.map((row) => ({
            id: uuidv4(),
            template_id: templateId,
            category_id: row.category_id,
            planned_amount: row.planned_amount,
          })),
        );
      });

      return { id: templateId };
    }),

  applyTemplate: protectedProcedure
    .input(applyTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;
      const { groupId, user } = await requireUserAndGroup(db, userId);

      const template = await db.query.provision_templates.findFirst({
        where: and(
          eq(provision_templates.group_id, groupId),
          eq(provision_templates.id, input.templateId),
        ),
      });

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template não encontrado.",
        });
      }

      const items = await db.query.provision_template_items.findMany({
        where: eq(provision_template_items.template_id, template.id),
      });

      if (!items.length) {
        return { inserted: 0, updated: 0 };
      }

      const categoryRows = await db.query.categories.findMany({
        where: eq(categories.group_id, groupId),
      });
      const dictionary = buildCategoryDictionary(categoryRows);
      const allowed = ensureCategoryIds(
        dictionary,
        input.categoryIds ?? items.map((item) => item.category_id),
      );

      if (!allowed.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nenhuma categoria válida correspondente ao template.",
        });
      }

      const itemMap = new Map(
        items
          .filter((item) => allowed.includes(item.category_id))
          .map((item) => [item.category_id, toNumber(item.planned_amount)]),
      );

      const existingRows = await db.query.provisions.findMany({
        where: and(
          eq(provisions.group_id, groupId),
          eq(provisions.month, input.target.month),
          eq(provisions.year, input.target.year),
          inArray(provisions.category_id, Array.from(itemMap.keys())),
        ),
      });

      const existingMap = new Map(
        existingRows.map((row) => [row.category_id, row]),
      );

      let inserted = 0;
      let updated = 0;

      await db.transaction(async (tx) => {
        for (const [categoryId, plannedAmount] of itemMap.entries()) {
          const existing = existingMap.get(categoryId);
          if (existing) {
            if (!input.overwrite) {
              continue;
            }
            await tx
              .update(provisions)
              .set({
                planned_amount: toMoneyString(plannedAmount),
                updated_at: new Date(),
              })
              .where(eq(provisions.id, existing.id));
            await recordAuditLog(tx, {
              groupId,
              userId: user.id,
              categoryId,
              month: input.target.month,
              year: input.target.year,
              action: "apply_template_update",
              previousAmount: toNumber(existing.planned_amount),
              newAmount: plannedAmount,
              context: { templateId: template.id },
            });
            updated += 1;
          } else {
            await tx.insert(provisions).values({
              id: uuidv4(),
              group_id: groupId,
              category_id: categoryId,
              month: input.target.month,
              year: input.target.year,
              planned_amount: toMoneyString(plannedAmount),
            });
            await recordAuditLog(tx, {
              groupId,
              userId: user.id,
              categoryId,
              month: input.target.month,
              year: input.target.year,
              action: "apply_template_create",
              newAmount: plannedAmount,
              context: { templateId: template.id },
            });
            inserted += 1;
          }
        }
      });

      return { inserted, updated };
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;
      const { groupId } = await requireUserAndGroup(db, userId);

      await db
        .delete(provision_templates)
        .where(
          and(
            eq(provision_templates.group_id, groupId),
            eq(provision_templates.id, input.id),
          ),
        );

      return { success: true };
    }),

  importCsv: protectedProcedure
    .input(importCsvSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;
      const { groupId, user } = await requireUserAndGroup(db, userId);

      const categoryRows = await db.query.categories.findMany({
        where: eq(categories.group_id, groupId),
      });
      const dictionary = buildCategoryDictionary(categoryRows);

      let inserted = 0;
      let updated = 0;

      await db.transaction(async (tx) => {
        for (const row of input.rows) {
          const categoryId =
            row.categoryId ??
            Array.from(dictionary.entries()).find(
              ([, value]) =>
                value.name.toLowerCase() === row.categoryName?.toLowerCase(),
            )?.[0];

          if (!categoryId || !dictionary.has(categoryId)) {
            continue;
          }

          const plannedAmount = parseCsvValue(row.plannedAmount) || 0;
          const note = ensureNote(row.note);

          const existing = await tx.query.provisions.findFirst({
            where: and(
              eq(provisions.group_id, groupId),
              eq(provisions.category_id, categoryId),
              eq(provisions.month, row.month),
              eq(provisions.year, row.year),
            ),
          });

          if (existing) {
            if (!input.overwrite) {
              continue;
            }
            await tx
              .update(provisions)
              .set({
                planned_amount: toMoneyString(plannedAmount),
                note,
                updated_at: new Date(),
              })
              .where(eq(provisions.id, existing.id));
            await recordAuditLog(tx, {
              groupId,
              userId: user.id,
              categoryId,
              month: row.month,
              year: row.year,
              action: "import_update",
              previousAmount: toNumber(existing.planned_amount),
              newAmount: plannedAmount,
            });
            updated += 1;
          } else {
            await tx.insert(provisions).values({
              id: uuidv4(),
              group_id: groupId,
              category_id: categoryId,
              month: row.month,
              year: row.year,
              planned_amount: toMoneyString(plannedAmount),
              note,
            });
            await recordAuditLog(tx, {
              groupId,
              userId: user.id,
              categoryId,
              month: row.month,
              year: row.year,
              action: "import_create",
              newAmount: plannedAmount,
            });
            inserted += 1;
          }
        }
      });

      return { inserted, updated };
    }),

  exportCsv: protectedProcedure
    .input(periodSchema.optional())
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;
      const { groupId } = await requireUserAndGroup(db, userId);
      const period = resolvePeriod(input ?? undefined);

      const rows = await db
        .select({
          categoryId: provisions.category_id,
          month: provisions.month,
          year: provisions.year,
          plannedAmount: provisions.planned_amount,
          note: provisions.note,
          categoryName: categories.name,
        })
        .from(provisions)
        .leftJoin(
          categories,
          and(
            eq(categories.id, provisions.category_id),
            eq(categories.group_id, groupId),
          ),
        )
        .where(
          and(
            eq(provisions.group_id, groupId),
            eq(provisions.month, period.month),
            eq(provisions.year, period.year),
          ),
        )
        .orderBy(categories.name);

      const header = [
        "category_id",
        "category_name",
        "month",
        "year",
        "planned_amount",
        "note",
      ].join(";");

      const lines = rows.map((row) =>
        [
          row.categoryId,
          row.categoryName ?? "",
          row.month,
          row.year,
          toNumber(row.plannedAmount).toFixed(2).replace(".", ","),
          (row.note ?? "").replace(/"/g, '""'),
        ].join(";"),
      );

      return [header, ...lines].join("\n");
    }),

  history: protectedProcedure
    .input(historySchema)
    .query(async ({ ctx, input }) => {
      const { db, userId } = ctx;
      const { groupId } = await requireUserAndGroup(db, userId);

      const historyFilters: SQL<unknown>[] = [
        eq(provision_audit_logs.group_id, groupId),
      ];
      if (input?.categoryId) {
        historyFilters.push(
          eq(provision_audit_logs.category_id, input.categoryId),
        );
      }
      if (input?.period) {
        historyFilters.push(
          eq(provision_audit_logs.month, input.period.month),
          eq(provision_audit_logs.year, input.period.year),
        );
      }

      const [firstFilter, ...restFilters] = historyFilters;
      if (firstFilter === undefined) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Não foi possível carregar o histórico solicitado.",
        });
      }
      let whereCondition: SQL<unknown> = firstFilter;
      for (const filter of restFilters) {
        if (filter === undefined) {
          continue;
        }
        const safeFilter = filter as SQL<unknown>;
        whereCondition = and(whereCondition, safeFilter) as SQL<unknown>;
      }

      const rows = await db
        .select({
          id: provision_audit_logs.id,
          categoryId: provision_audit_logs.category_id,
          month: provision_audit_logs.month,
          year: provision_audit_logs.year,
          action: provision_audit_logs.action,
          previousAmount: provision_audit_logs.previous_amount,
          newAmount: provision_audit_logs.new_amount,
          context: provision_audit_logs.context,
          createdAt: provision_audit_logs.created_at,
          categoryName: categories.name,
          userName: users.name,
        })
        .from(provision_audit_logs)
        .leftJoin(
          categories,
          eq(categories.id, provision_audit_logs.category_id),
        )
        .leftJoin(users, eq(users.id, provision_audit_logs.user_id))
        .where(whereCondition)
        .orderBy(desc(provision_audit_logs.created_at))
        .limit(input?.limit ?? 40);

      return rows.map((row) => ({
        id: row.id,
        categoryId: row.categoryId,
        categoryName: row.categoryName ?? "Sem categoria",
        periodLabel: formatMonthLabel(row.month, row.year),
        action: row.action,
        previousAmount: row.previousAmount
          ? toNumber(row.previousAmount)
          : null,
        newAmount: row.newAmount ? toNumber(row.newAmount) : null,
        context: row.context ?? {},
        createdAt: row.createdAt?.toISOString() ?? null,
        userName: row.userName ?? "Sistema",
      }));
    }),

  recurringRules: protectedProcedure.query(async ({ ctx }) => {
    const { db, userId } = ctx;
    const { groupId } = await requireUserAndGroup(db, userId);

    const rules = await db.query.provision_recurring_rules.findMany({
      where: eq(provision_recurring_rules.group_id, groupId),
      orderBy: (rule, { desc }) => desc(rule.created_at),
    });

    return rules.map((rule) => ({
      id: rule.id,
      categoryId: rule.category_id,
      plannedAmount: toNumber(rule.planned_amount),
      startMonth: rule.start_month,
      startYear: rule.start_year,
      endMonth: rule.end_month,
      endYear: rule.end_year,
      applyAutomatically: rule.apply_automatically,
      notes: rule.notes,
      createdAt: rule.created_at?.toISOString() ?? null,
      updatedAt: rule.updated_at?.toISOString() ?? null,
    }));
  }),

  upsertRecurringRule: protectedProcedure
    .input(recurringRuleSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;
      const { groupId, user } = await requireUserAndGroup(db, userId);

      const ruleId = input.id ?? uuidv4();

      if (input.id) {
        await db
          .update(provision_recurring_rules)
          .set({
            category_id: input.categoryId,
            planned_amount: toMoneyString(input.plannedAmount),
            start_month: input.startMonth,
            start_year: input.startYear,
            end_month: input.endMonth ?? null,
            end_year: input.endYear ?? null,
            apply_automatically: input.applyAutomatically ?? true,
            notes: ensureNote(input.notes),
            updated_at: new Date(),
          })
          .where(
            and(
              eq(provision_recurring_rules.group_id, groupId),
              eq(provision_recurring_rules.id, input.id),
            ),
          );
      } else {
        await db.insert(provision_recurring_rules).values({
          id: ruleId,
          group_id: groupId,
          category_id: input.categoryId,
          planned_amount: toMoneyString(input.plannedAmount),
          start_month: input.startMonth,
          start_year: input.startYear,
          end_month: input.endMonth ?? null,
          end_year: input.endYear ?? null,
          apply_automatically: input.applyAutomatically ?? true,
          notes: ensureNote(input.notes),
          created_by: user.id,
        });
      }

      return { id: ruleId };
    }),

  deleteRecurringRule: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;
      const { groupId } = await requireUserAndGroup(db, userId);

      await db
        .delete(provision_recurring_rules)
        .where(
          and(
            eq(provision_recurring_rules.group_id, groupId),
            eq(provision_recurring_rules.id, input.id),
          ),
        );

      return { success: true };
    }),

  createTransfer: protectedProcedure
    .input(
      z.object({
        fromAccountId: z.string().uuid(),
        toAccountId: z.string().uuid(),
        amount: z.coerce.number().positive(),
        note: z.string().optional(),
        month: monthSchema,
        year: yearSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;
      const { groupId, user } = await requireUserAndGroup(db, userId);

      if (input.fromAccountId === input.toAccountId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A conta de origem e destino não podem ser iguais.",
        });
      }

      const accounts = await db.query.bank_accounts.findMany({
        where: and(
          eq(bank_accounts.group_id, groupId),
          inArray(bank_accounts.id, [input.fromAccountId, input.toAccountId]),
        ),
      });

      if (accounts.length !== 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Contas inválidas ou pertencem a outro grupo.",
        });
      }

      const fromAccount = accounts.find(
        (account) => account.id === input.fromAccountId,
      );
      const toAccount = accounts.find(
        (account) => account.id === input.toAccountId,
      );

      if (!fromAccount || !toAccount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não foi possível validar as contas selecionadas.",
        });
      }

      let transferCategory = await db.query.categories.findFirst({
        where: and(
          eq(categories.group_id, groupId),
          eq(categories.name, "Transferência entre contas"),
        ),
      });

      if (!transferCategory) {
        const categoryId = uuidv4();
        await db.insert(categories).values({
          id: categoryId,
          group_id: groupId,
          parent_id: null,
          name: "Transferência entre contas",
          type: "expense",
          color: "#888888",
          icon: "",
        });
        transferCategory = await db.query.categories.findFirst({
          where: and(
            eq(categories.group_id, groupId),
            eq(categories.id, categoryId),
          ),
        });
      }

      if (!transferCategory) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Não foi possível criar a categoria de transferência.",
        });
      }

      const plannedAmount = Number(input.amount);
      const fallbackNote = `Transferência de ${fromAccount.name} → ${toAccount.name}`;
      const finalNote = ensureNote(input.note ?? fallbackNote);

      const existingProvision = await db.query.provisions.findFirst({
        where: and(
          eq(provisions.group_id, groupId),
          eq(provisions.category_id, transferCategory.id),
          eq(provisions.month, input.month),
          eq(provisions.year, input.year),
        ),
      });

      await db.transaction(async (tx) => {
        if (existingProvision) {
          await tx
            .update(provisions)
            .set({
              planned_amount: toMoneyString(plannedAmount),
              note: finalNote,
              updated_at: new Date(),
            })
            .where(eq(provisions.id, existingProvision.id));

          await recordAuditLog(tx, {
            groupId,
            userId: user.id,
            categoryId: transferCategory.id,
            month: input.month,
            year: input.year,
            action: "create_transfer",
            previousAmount: toNumber(existingProvision.planned_amount),
            newAmount: plannedAmount,
            context: {
              fromAccountId: input.fromAccountId,
              toAccountId: input.toAccountId,
            },
          });
          return;
        }

        await tx.insert(provisions).values({
          id: uuidv4(),
          group_id: groupId,
          category_id: transferCategory.id,
          month: input.month,
          year: input.year,
          planned_amount: toMoneyString(plannedAmount),
          note: finalNote,
        });

        await recordAuditLog(tx, {
          groupId,
          userId: user.id,
          categoryId: transferCategory.id,
          month: input.month,
          year: input.year,
          action: "create_transfer",
          newAmount: plannedAmount,
          context: {
            fromAccountId: input.fromAccountId,
            toAccountId: input.toAccountId,
          },
        });
      });

      return {
        success: true,
        message: "Transferência planejada criada.",
      };
    }),

  createFinancialGroup: protectedProcedure
    .input(z.object({ name: z.string().min(2) }))
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;
      const { user } = await requireUserAndGroup(db, userId);

      const newGroupId = uuidv4();

      await db.insert(financial_groups).values({
        id: newGroupId,
        name: input.name,
        owner_id: user.id,
      });

      await db.insert(financial_group_members).values({
        group_id: newGroupId,
        user_id: user.id,
        role: "owner",
      });

      return { id: newGroupId, name: input.name };
    }),

  inviteGroupMember: protectedProcedure
    .input(
      z.object({
        groupId: z.string().uuid(),
        email: z.string().email(),
        role: z.enum(["owner", "editor", "viewer"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireUserAndGroup(ctx.db, ctx.userId);

      return {
        success: true,
        message: `Convite enviado para ${input.email}.`,
      };
    }),
});
