import { and, eq, gte, lte, sum } from "drizzle-orm";

import type { DbClient } from "@/server/db/client";
import { provisions, transactions } from "@/server/db/schema";

import {
  createMonthRange,
  resolvePeriod,
  toNumber,
  type PeriodInput,
} from "./helpers";

type MetricsParams = {
  db: DbClient;
  groupId: string;
  period?: PeriodInput;
};

export type ProvisionsMetricsResult = {
  month: number;
  year: number;
  plannedTotal: number;
  realizedTotal: number;
  remainingTotal: number;
  coverage: number;
  overBudgetTotal: number;
};

export const getProvisionsMetrics = async ({
  db,
  groupId,
  period,
}: MetricsParams): Promise<ProvisionsMetricsResult> => {
  const resolvedPeriod = resolvePeriod(period);
  const { start, end } = createMonthRange(resolvedPeriod);

  const [plannedRow, realizedRow, overBudgetRow] = await Promise.all([
    db
      .select({ total: sum(provisions.planned_amount) })
      .from(provisions)
      .where(
        and(
          eq(provisions.group_id, groupId),
          eq(provisions.month, resolvedPeriod.month),
          eq(provisions.year, resolvedPeriod.year),
        ),
      )
      .limit(1),
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
      .limit(1),
    db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .innerJoin(
        provisions,
        and(
          eq(provisions.group_id, groupId),
          eq(provisions.category_id, transactions.category_id),
          eq(provisions.month, resolvedPeriod.month),
          eq(provisions.year, resolvedPeriod.year),
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
      .limit(1),
  ]);

  const plannedTotal = toNumber(plannedRow[0]?.total);
  const realizedTotal = toNumber(realizedRow[0]?.total);
  const overBudgetTotal = toNumber(overBudgetRow[0]?.total);
  const remainingTotal = plannedTotal - realizedTotal;
  const coverage =
    plannedTotal === 0 ? 0 : Number(((realizedTotal / plannedTotal) * 100).toFixed(2));

  return {
    month: resolvedPeriod.month,
    year: resolvedPeriod.year,
    plannedTotal: Number(plannedTotal.toFixed(2)),
    realizedTotal: Number(realizedTotal.toFixed(2)),
    remainingTotal: Number(remainingTotal.toFixed(2)),
    coverage,
    overBudgetTotal: Number(overBudgetTotal.toFixed(2)),
  };
};

