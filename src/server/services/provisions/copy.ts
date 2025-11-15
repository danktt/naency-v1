import { and, eq, inArray } from "drizzle-orm";

import type { DbClient } from "@/server/db/client";
import { provisions } from "@/server/db/schema";

import {
  ensureCategoryIds,
  loadCategoryDictionary,
  normalizeNote,
  recordProvisionAuditLog,
  resolvePeriod,
  toMoneyString,
  toNumber,
  type PeriodInput,
} from "./helpers";

type CopyParams = {
  db: DbClient;
  groupId: string;
  userId: string;
  from: PeriodInput;
  to: PeriodInput;
  overwrite?: boolean;
  categoryIds?: string[];
};

export const copyProvisionsToPeriod = async ({
  db,
  groupId,
  userId,
  from,
  to,
  overwrite = false,
  categoryIds,
}: CopyParams) => {
  const fromPeriod = resolvePeriod(from);
  const toPeriod = resolvePeriod(to);

  if (fromPeriod.month === toPeriod.month && fromPeriod.year === toPeriod.year) {
    return { inserted: 0, updated: 0 };
  }

  const dictionary = await loadCategoryDictionary(db, groupId);
  const allowedCategories = ensureCategoryIds(dictionary, categoryIds);

  if (!allowedCategories.length) {
    return { inserted: 0, updated: 0 };
  }

  const sourceRows = await db.query.provisions.findMany({
    where: and(
      eq(provisions.group_id, groupId),
      eq(provisions.month, fromPeriod.month),
      eq(provisions.year, fromPeriod.year),
      inArray(provisions.category_id, allowedCategories),
    ),
  });

  if (!sourceRows.length) {
    return { inserted: 0, updated: 0 };
  }

  const targetRows = await db.query.provisions.findMany({
    where: and(
      eq(provisions.group_id, groupId),
      eq(provisions.month, toPeriod.month),
      eq(provisions.year, toPeriod.year),
      inArray(provisions.category_id, allowedCategories),
    ),
  });

  const targetMap = new Map(targetRows.map((row) => [row.category_id, row]));

  let inserted = 0;
  let updated = 0;

  for (const row of sourceRows) {
    const plannedAmount = toNumber(row.planned_amount);
    const note = normalizeNote(row.note);
    const target = targetMap.get(row.category_id);

    if (!target) {
      await db.insert(provisions).values({
        group_id: groupId,
        category_id: row.category_id,
        month: toPeriod.month,
        year: toPeriod.year,
        planned_amount: toMoneyString(plannedAmount),
        note,
      });

      await recordProvisionAuditLog(db, {
        groupId,
        userId,
        categoryId: row.category_id,
        month: toPeriod.month,
        year: toPeriod.year,
        action: "copy_create",
        newAmount: plannedAmount,
        context: {
          fromMonth: fromPeriod.month,
          fromYear: fromPeriod.year,
        },
      });

      inserted += 1;
      continue;
    }

    if (!overwrite) {
      continue;
    }

    await db
      .update(provisions)
      .set({
        planned_amount: toMoneyString(plannedAmount),
        note,
        updated_at: new Date(),
      })
      .where(eq(provisions.id, target.id));

    await recordProvisionAuditLog(db, {
      groupId,
      userId,
      categoryId: row.category_id,
      month: toPeriod.month,
      year: toPeriod.year,
      action: "copy_update",
      previousAmount: toNumber(target.planned_amount),
      newAmount: plannedAmount,
      context: {
        fromMonth: fromPeriod.month,
        fromYear: fromPeriod.year,
      },
    });

    updated += 1;
  }

  return { inserted, updated };
};

