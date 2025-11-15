import { eq } from "drizzle-orm";

import type { DbClient } from "@/server/db/client";
import { categories, provision_audit_logs } from "@/server/db/schema";

type Numericish = string | number | null | undefined;

export type Period = { month: number; year: number };
export type PeriodInput = { month?: number; year?: number } | null | undefined;

export type CategoryDictionaryEntry = (typeof categories.$inferSelect) & {
  path: string[];
  depth: number;
};

export type CategoryDictionary = Map<string, CategoryDictionaryEntry>;

export const toNumber = (value: Numericish) => {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const toMoneyString = (value: number) => value.toFixed(2);

export const normalizePlannedAmount = (value: number) =>
  Number.isFinite(value) ? Number(value) : 0;

export const normalizeNote = (note?: string | null) => {
  if (!note) {
    return null;
  }
  const trimmed = note.trim();
  return trimmed.length ? trimmed : null;
};

export const resolvePeriod = (input?: PeriodInput): Period => {
  const now = new Date();
  return {
    month:
      typeof input?.month === "number" ? input.month : now.getMonth(),
    year: typeof input?.year === "number" ? input.year : now.getFullYear(),
  };
};

export const createMonthRange = (period: Period) => {
  const start = new Date(period.year, period.month, 1);
  const end = new Date(period.year, period.month + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

export const loadCategoryDictionary = async (
  db: DbClient,
  groupId: string,
): Promise<CategoryDictionary> => {
  const rows = await db.query.categories.findMany({
    where: eq(categories.group_id, groupId),
  });

  const byId = new Map<string, typeof rows[number]>();
  const children = new Map<string | null, string[]>();

  rows.forEach((row) => {
    byId.set(row.id, row);
    const parentKey = row.parent_id ?? null;
    if (!children.has(parentKey)) {
      children.set(parentKey, []);
    }
    children.get(parentKey)!.push(row.id);
  });

  const dictionary: CategoryDictionary = new Map();

  const traverse = (id: string, ancestors: string[]) => {
    const node = byId.get(id);
    if (!node) {
      return;
    }
    const path = [...ancestors, node.name];
    dictionary.set(id, {
      ...node,
      path,
      depth: ancestors.length,
    });
    const childIds = [...(children.get(id) ?? [])].sort((a, b) => {
      const nameA = byId.get(a)?.name ?? "";
      const nameB = byId.get(b)?.name ?? "";
      return nameA.localeCompare(nameB, "pt-BR", { sensitivity: "base" });
    });
    childIds.forEach((childId) => traverse(childId, path));
  };

  const rootIds = [...(children.get(null) ?? [])].sort((a, b) => {
    const nameA = byId.get(a)?.name ?? "";
    const nameB = byId.get(b)?.name ?? "";
    return nameA.localeCompare(nameB, "pt-BR", { sensitivity: "base" });
  });

  rootIds.forEach((rootId) => traverse(rootId, []));

  return dictionary;
};

export const ensureCategoryIds = (
  dictionary: CategoryDictionary,
  ids?: string[],
) => {
  if (!ids?.length) {
    return Array.from(dictionary.keys());
  }
  return ids.filter((id) => dictionary.has(id));
};

export const recordProvisionAuditLog = async (
  db: DbClient,
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


