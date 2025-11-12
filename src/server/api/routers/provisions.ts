import { TRPCError } from "@trpc/server";
import { and, eq, gte, lte, sum } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { categories, provisions, transactions } from "../../db/schema";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { requireUserAndGroup } from "../utils/getUserAndGroup";

type Numericish = string | number | null | undefined;

const monthSchema = z.number().int().min(0).max(11);
const yearSchema = z.number().int().min(2000).max(2100);

const periodInputSchema = z
  .object({
    month: monthSchema,
    year: yearSchema,
  })
  .optional();

const listInputSchema = z
  .object({
    month: monthSchema.optional(),
    year: yearSchema.optional(),
  })
  .optional();

const upsertInputSchema = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid(),
  month: monthSchema,
  year: yearSchema,
  plannedAmount: z.coerce.number().min(0, "Informe um valor válido."),
});

const deleteInputSchema = z.object({
  id: z.string().uuid(),
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

const serializeProvision = (record: {
  id: string;
  categoryId: string;
  plannedAmount: Numericish;
  month: number;
  year: number;
  createdAt: Date;
  categoryName: string | null;
  categoryColor: string | null;
}) => ({
  id: record.id,
  categoryId: record.categoryId,
  month: record.month,
  year: record.year,
  plannedAmount: toNumber(record.plannedAmount),
  category: {
    name: record.categoryName ?? "Sem categoria",
    color: record.categoryColor ?? "#9ca3af",
  },
  createdAt: record.createdAt.toISOString(),
});

export const provisionsRouter = createTRPCRouter({
  summary: protectedProcedure
    .input(periodInputSchema)
    .query(async ({ ctx, input }) => {
      const { db, userId } = ctx;
      const { groupId } = await requireUserAndGroup(db, userId);
      const period = resolvePeriod(input);
      const { start, end } = createMonthRange(period.month, period.year);

      const [plannedRow, committedRow] = await Promise.all([
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
              eq(transactions.type, "expense"),
              gte(transactions.date, start),
              lte(transactions.date, end),
            ),
          )
          .limit(1)
          .then((rows) => rows[0]),
      ]);

      const plannedTotal = toNumber(plannedRow?.total);
      const committedTotal = toNumber(committedRow?.total);
      const remainingTotal = plannedTotal - committedTotal;
      const coverage =
        plannedTotal === 0 ? 0 : (committedTotal / plannedTotal) * 100;

      return {
        month: period.month,
        year: period.year,
        plannedTotal,
        committedTotal,
        remainingTotal,
        coverage,
        automation: {
          autopilotTracked: 0,
          autopilotEnabled: 0,
          ratio: 0,
        },
      };
    }),

  distribution: protectedProcedure
    .input(periodInputSchema)
    .query(async ({ ctx, input }) => {
      const { db, userId } = ctx;
      const { groupId } = await requireUserAndGroup(db, userId);
      const period = resolvePeriod(input);
      const { start, end } = createMonthRange(period.month, period.year);

      const [plannedRows, committedRows] = await Promise.all([
        db
          .select({
            categoryId: provisions.category_id,
            categoryName: categories.name,
            categoryColor: categories.color,
            plannedAmount: sum(provisions.planned_amount),
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
          .groupBy(provisions.category_id, categories.name, categories.color),
        db
          .select({
            categoryId: transactions.category_id,
            categoryNameSnapshot: transactions.category_name_snapshot,
            categoryName: categories.name,
            categoryColor: categories.color,
            committedAmount: sum(transactions.amount),
          })
          .from(transactions)
          .leftJoin(
            categories,
            and(
              eq(categories.id, transactions.category_id),
              eq(categories.group_id, groupId),
            ),
          )
          .where(
            and(
              eq(transactions.group_id, groupId),
              eq(transactions.type, "expense"),
              gte(transactions.date, start),
              lte(transactions.date, end),
            ),
          )
          .groupBy(
            transactions.category_id,
            transactions.category_name_snapshot,
            categories.name,
            categories.color,
          ),
      ]);

      const committedMap = new Map<
        string | null,
        {
          committedAmount: number;
          categoryNameSnapshot: string | null;
          categoryName: string | null;
          categoryColor: string | null;
        }
      >();

      committedRows.forEach((row) => {
        committedMap.set(row.categoryId ?? null, {
          committedAmount: toNumber(row.committedAmount),
          categoryNameSnapshot: row.categoryNameSnapshot,
          categoryName: row.categoryName,
          categoryColor: row.categoryColor,
        });
      });

      const distribution = plannedRows.map((row) => {
        const committed = committedMap.get(row.categoryId) ?? {
          committedAmount: 0,
          categoryNameSnapshot: null,
          categoryName: null,
          categoryColor: null,
        };

        const plannedAmount = toNumber(row.plannedAmount);
        const committedAmount = committed.committedAmount;

        return {
          categoryId: row.categoryId,
          plannedAmount,
          committedAmount,
          variance: committedAmount - plannedAmount,
          category: {
            name:
              row.categoryName ??
              committed.categoryNameSnapshot ??
              committed.categoryName ??
              "Sem categoria",
            color: row.categoryColor ?? committed.categoryColor ?? "#9ca3af",
          },
        };
      });

      committedRows.forEach((row) => {
        if (!row.categoryId) {
          return;
        }

        const alreadyIncluded = distribution.some(
          (item) => item.categoryId === row.categoryId,
        );

        if (alreadyIncluded) {
          return;
        }

        distribution.push({
          categoryId: row.categoryId,
          plannedAmount: 0,
          committedAmount: toNumber(row.committedAmount),
          variance: toNumber(row.committedAmount),
          category: {
            name:
              row.categoryName ?? row.categoryNameSnapshot ?? "Sem categoria",
            color: row.categoryColor ?? "#9ca3af",
          },
        });
      });

      return distribution.sort((a, b) =>
        a.category.name.localeCompare(b.category.name, "pt-BR", {
          sensitivity: "base",
        }),
      );
    }),

  list: protectedProcedure
    .input(listInputSchema)
    .query(async ({ ctx, input }) => {
      const { db, userId } = ctx;
      const { groupId } = await requireUserAndGroup(db, userId);
      const period = resolvePeriod(input);
      const { start, end } = createMonthRange(period.month, period.year);

      const [provisionRows, committedRows] = await Promise.all([
        db
          .select({
            id: provisions.id,
            categoryId: provisions.category_id,
            plannedAmount: provisions.planned_amount,
            month: provisions.month,
            year: provisions.year,
            createdAt: provisions.created_at,
            categoryName: categories.name,
            categoryColor: categories.color,
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
          .orderBy(provisions.created_at),
        db
          .select({
            categoryId: transactions.category_id,
            committedAmount: sum(transactions.amount),
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.group_id, groupId),
              eq(transactions.type, "expense"),
              gte(transactions.date, start),
              lte(transactions.date, end),
            ),
          )
          .groupBy(transactions.category_id),
      ]);

      const committedMap = new Map<string | null, number>();
      committedRows.forEach((row) => {
        committedMap.set(row.categoryId ?? null, toNumber(row.committedAmount));
      });

      return provisionRows.map((row) => {
        const serialized = serializeProvision(row);
        return {
          ...serialized,
          committedAmount: committedMap.get(row.categoryId) ?? 0,
        };
      });
    }),

  upsert: protectedProcedure
    .input(upsertInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;
      const { groupId } = await requireUserAndGroup(db, userId);
      const plannedAmount = toMoneyString(input.plannedAmount);

      const existingCategory = await db.query.categories.findFirst({
        where: and(
          eq(categories.id, input.categoryId),
          eq(categories.group_id, groupId),
        ),
      });

      if (!existingCategory) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Categoria não encontrada para este grupo.",
        });
      }

      if (input.id) {
        const existingProvision = await db.query.provisions.findFirst({
          where: and(
            eq(provisions.id, input.id),
            eq(provisions.group_id, groupId),
          ),
        });

        if (!existingProvision) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Provisão não encontrada.",
          });
        }

        const [updated] = await db
          .update(provisions)
          .set({
            category_id: input.categoryId,
            month: input.month,
            year: input.year,
            planned_amount: plannedAmount,
          })
          .where(eq(provisions.id, input.id))
          .returning({
            id: provisions.id,
            categoryId: provisions.category_id,
            plannedAmount: provisions.planned_amount,
            month: provisions.month,
            year: provisions.year,
            createdAt: provisions.created_at,
          });

        if (!updated) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erro ao atualizar provisão.",
          });
        }

        return {
          ...serializeProvision({
            ...updated,
            categoryName: existingCategory.name,
            categoryColor: existingCategory.color,
          }),
          committedAmount: 0,
        };
      }

      const [existingSimilar] = await db
        .select({
          id: provisions.id,
        })
        .from(provisions)
        .where(
          and(
            eq(provisions.group_id, groupId),
            eq(provisions.category_id, input.categoryId),
            eq(provisions.month, input.month),
            eq(provisions.year, input.year),
          ),
        )
        .limit(1);

      if (existingSimilar) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Já existe uma provisão para esta categoria e período.",
        });
      }

      const [created] = await db
        .insert(provisions)
        .values({
          id: uuidv4(),
          group_id: groupId,
          category_id: input.categoryId,
          month: input.month,
          year: input.year,
          planned_amount: plannedAmount,
        })
        .returning({
          id: provisions.id,
          categoryId: provisions.category_id,
          plannedAmount: provisions.planned_amount,
          month: provisions.month,
          year: provisions.year,
          createdAt: provisions.created_at,
        });

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao criar provisão.",
        });
      }

      return {
        ...serializeProvision({
          ...created,
          categoryName: existingCategory.name,
          categoryColor: existingCategory.color,
        }),
        committedAmount: 0,
      };
    }),

  delete: protectedProcedure
    .input(deleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;
      const { groupId } = await requireUserAndGroup(db, userId);

      const existingProvision = await db.query.provisions.findFirst({
        where: and(
          eq(provisions.id, input.id),
          eq(provisions.group_id, groupId),
        ),
      });

      if (!existingProvision) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Provisão não encontrada.",
        });
      }

      await db.delete(provisions).where(eq(provisions.id, input.id));

      return { success: true };
    }),
});
