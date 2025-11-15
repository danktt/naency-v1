import {
  bulkUpsertSchema,
  copySchema,
  gridInputSchema,
  optionalPeriodSchema,
  plannedVsActualChartInputSchema,
} from "../../schemas/provisions";
import {
  bulkUpsertProvisions,
  copyProvisionsToPeriod,
  getPlannedVsActualChart,
  getProvisionsGrid,
  getProvisionsMetrics,
} from "../../services/provisions";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { requireUserAndGroup } from "../utils/getUserAndGroup";

export const provisionsRouter = createTRPCRouter({
  metrics: protectedProcedure
    .input(optionalPeriodSchema.optional())
    .query(async ({ ctx, input }) => {
      const { groupId } = await requireUserAndGroup(ctx.db, ctx.userId);
      return getProvisionsMetrics({
        db: ctx.db,
        groupId,
        period: input,
      });
    }),
  grid: protectedProcedure
    .input(gridInputSchema.optional())
    .query(async ({ ctx, input }) => {
      const { groupId } = await requireUserAndGroup(ctx.db, ctx.userId);
      return getProvisionsGrid({
        db: ctx.db,
        groupId,
        period: input?.period,
        includeInactive: input?.includeInactive,
        type: input?.type ?? "all",
      });
    }),
  bulkUpsert: protectedProcedure
    .input(bulkUpsertSchema)
    .mutation(async ({ ctx, input }) => {
      const { groupId, user } = await requireUserAndGroup(ctx.db, ctx.userId);
      return bulkUpsertProvisions({
        db: ctx.db,
        groupId,
        userId: user.id,
        period: input.period,
        entries: input.entries,
      });
    }),
  copyFromPrevious: protectedProcedure
    .input(copySchema)
    .mutation(async ({ ctx, input }) => {
      const { groupId, user } = await requireUserAndGroup(ctx.db, ctx.userId);
      return copyProvisionsToPeriod({
        db: ctx.db,
        groupId,
        userId: user.id,
        from: input.from,
        to: input.to,
        overwrite: input.overwrite,
        categoryIds: input.categoryIds,
      });
    }),
  plannedVsActualChart: protectedProcedure
    .input(plannedVsActualChartInputSchema)
    .query(async ({ ctx, input }) => {
      const { groupId } = await requireUserAndGroup(ctx.db, ctx.userId);
      return getPlannedVsActualChart({
        db: ctx.db,
        groupId,
        period: input?.period,
        type: input?.type ?? "expense",
        limit: input?.limit ?? 6,
      });
    }),
});
