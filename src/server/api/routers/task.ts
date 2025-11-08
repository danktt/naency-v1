import { desc } from "drizzle-orm";
import { z } from "zod";

import { tasks } from "../../db/schema";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const taskRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(tasks).orderBy(desc(tasks.createdAt)).limit(50);
  }),
  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(1, "O título é obrigatório"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [task] = await ctx.db
        .insert(tasks)
        .values({ title: input.title })
        .returning();

      return task;
    }),
});

