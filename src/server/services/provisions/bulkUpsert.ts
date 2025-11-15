import { and, eq, inArray } from "drizzle-orm";

import type { DbClient } from "@/server/db/client";
import { provisions } from "@/server/db/schema";

import {
  normalizeNote,
  normalizePlannedAmount,
  recordProvisionAuditLog,
  resolvePeriod,
  toMoneyString,
  toNumber,
  type PeriodInput,
} from "./helpers";

type BulkUpsertEntry = {
  categoryId: string;
  plannedAmount: number;
  note?: string | null;
};

type BulkUpsertParams = {
  db: DbClient;
  groupId: string;
  userId: string;
  period: PeriodInput;
  entries: BulkUpsertEntry[];
};

export const bulkUpsertProvisions = async ({
  db,
  groupId,
  userId,
  period,
  entries,
}: BulkUpsertParams) => {
  const resolvedPeriod = resolvePeriod(period);

  const uniqueCategoryIds = Array.from(
    new Set(entries.map((entry) => entry.categoryId)),
  );

  if (!uniqueCategoryIds.length) {
    return { updated: [], count: 0 };
  }

  const existingRows = await db.query.provisions.findMany({
    where: and(
      eq(provisions.group_id, groupId),
      eq(provisions.month, resolvedPeriod.month),
      eq(provisions.year, resolvedPeriod.year),
      inArray(provisions.category_id, uniqueCategoryIds),
    ),
  });

  const existingMap = new Map(existingRows.map((row) => [row.category_id, row]));

  const updatedEntries: Array<{
    categoryId: string;
    plannedAmount: number;
    note: string | null;
  }> = [];

  for (const entry of entries) {
    const plannedAmount = normalizePlannedAmount(entry.plannedAmount);
    const note = normalizeNote(entry.note);
    const existing = existingMap.get(entry.categoryId);

    if (existing) {
      await db
        .update(provisions)
        .set({
          planned_amount: toMoneyString(plannedAmount),
          note,
          updated_at: new Date(),
        })
        .where(eq(provisions.id, existing.id));

      await recordProvisionAuditLog(db, {
        groupId,
        userId,
        categoryId: entry.categoryId,
        month: resolvedPeriod.month,
        year: resolvedPeriod.year,
        action: "update",
        previousAmount: toNumber(existing.planned_amount),
        newAmount: plannedAmount,
        context: note ? { note } : undefined,
      });
    } else {
      await db.insert(provisions).values({
        group_id: groupId,
        category_id: entry.categoryId,
        month: resolvedPeriod.month,
        year: resolvedPeriod.year,
        planned_amount: toMoneyString(plannedAmount),
        note,
      });

      await recordProvisionAuditLog(db, {
        groupId,
        userId,
        categoryId: entry.categoryId,
        month: resolvedPeriod.month,
        year: resolvedPeriod.year,
        action: "create",
        newAmount: plannedAmount,
        context: note ? { note } : undefined,
      });
    }

    updatedEntries.push({
      categoryId: entry.categoryId,
      plannedAmount,
      note,
    });
  }

  return {
    updated: updatedEntries,
    count: updatedEntries.length,
  };
};

