import { createTRPCRouter, protectedProcedure } from "../trpc";

export const categoryPresetsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.query.category_presets.findMany();
    return rows.sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
    );
  }),
});
