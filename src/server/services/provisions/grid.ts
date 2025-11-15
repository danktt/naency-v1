import {
  and,
  eq,
  gte,
  inArray,
  lte,
  sum,
} from "drizzle-orm";

import type { DbClient } from "@/server/db/client";
import { provisions, transactions } from "@/server/db/schema";

import {
  createMonthRange,
  loadCategoryDictionary,
  resolvePeriod,
  toNumber,
  type PeriodInput,
} from "./helpers";

type GridParams = {
  db: DbClient;
  groupId: string;
  period?: PeriodInput;
  includeInactive?: boolean;
  type?: "all" | "expense" | "income";
};

export type ProvisionsGridRow = {
  id: string;
  categoryId: string;
  name: string;
  color: string | null;
  type: "expense" | "income";
  parentId: string | null;
  planned: number;
  realized: number;
};

export type ProvisionsGridResult = {
  rows: ProvisionsGridRow[];
};

export const getProvisionsGrid = async ({
  db,
  groupId,
  period,
  includeInactive = false,
  type = "all",
}: GridParams): Promise<ProvisionsGridResult> => {
  const resolvedPeriod = resolvePeriod(period);
  const { start, end } = createMonthRange(resolvedPeriod);

  const dictionary = await loadCategoryDictionary(db, groupId);
  const categoriesArray = Array.from(dictionary.values()).filter((category) => {
    if (!includeInactive && category.is_active === false) {
      return false;
    }
    if (type !== "all" && category.type !== type) {
      return false;
    }
    return true;
  });

  if (!categoriesArray.length) {
    return { rows: [] };
  }

  const categoryIds = categoriesArray.map((category) => category.id);

  const [plannedRows, realizedRows] = await Promise.all([
    db.query.provisions.findMany({
      where: and(
        eq(provisions.group_id, groupId),
        eq(provisions.month, resolvedPeriod.month),
        eq(provisions.year, resolvedPeriod.year),
        inArray(provisions.category_id, categoryIds),
      ),
    }),
    db
      .select({
        categoryId: transactions.category_id,
        amount: sum(transactions.amount),
        transactionType: transactions.type,
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

  const plannedMap = new Map(
    plannedRows.map((row) => [row.category_id, toNumber(row.planned_amount)]),
  );

  const realizedMap = new Map<
    string,
    { income: number; expense: number }
  >();

  realizedRows.forEach((row) => {
    if (!row.categoryId) {
      return;
    }
    const bucket = realizedMap.get(row.categoryId) ?? {
      income: 0,
      expense: 0,
    };
    if (row.transactionType === "income") {
      bucket.income += toNumber(row.amount);
    } else if (row.transactionType === "expense") {
      bucket.expense += toNumber(row.amount);
    }
    realizedMap.set(row.categoryId, bucket);
  });

  const rows: ProvisionsGridRow[] = categoriesArray.map((category) => {
    const planned = plannedMap.get(category.id) ?? 0;
    const realizedBucket = realizedMap.get(category.id);
    const realized =
      realizedBucket?.[
        category.type === "income" ? "income" : "expense"
      ] ?? 0;

    return {
      id: category.id,
      categoryId: category.id,
      name: category.name,
      color: category.color ?? null,
      type: category.type as "expense" | "income",
      parentId: category.parent_id ?? null,
      planned: Number(planned.toFixed(2)),
      realized: Number(realized.toFixed(2)),
    };
  });

  return { rows };
};

