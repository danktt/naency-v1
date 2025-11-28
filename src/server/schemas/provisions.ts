import { z } from "zod";

export const monthSchema = z.number().int().min(0).max(11);
export const yearSchema = z.number().int().min(2000).max(2100);

export const periodSchema = z.object({
  month: monthSchema,
  year: yearSchema,
});

export const optionalPeriodSchema = periodSchema.partial();

export const gridInputSchema = z.object({
  period: periodSchema,
  includeInactive: z.boolean().optional(),
  type: z.enum(["all", "expense", "income"]).optional(),
});

export const bulkUpsertSchema = z.object({
  period: periodSchema,
  entries: z
    .array(
      z.object({
        categoryId: z.string().uuid(),
        plannedAmount: z.coerce.number().min(0),
        note: z.string().max(2000).optional(),
      }),
    )
    .min(1),
});

export const copySchema = z.object({
  from: periodSchema,
  to: periodSchema,
  overwrite: z.boolean().optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
});

export const plannedVsActualChartInputSchema = z
  .object({
    period: optionalPeriodSchema.optional(),
    type: z.enum(["expense", "income"]).optional(),
    limit: z.number().int().min(1).max(12).optional(),
  })
  .optional();

export const expenseDistributionInputSchema = z
  .object({
    period: optionalPeriodSchema.optional(),
    type: z.enum(["expense", "income"]).optional(),
    limit: z.number().int().min(1).max(15).optional(),
  })
  .optional();
