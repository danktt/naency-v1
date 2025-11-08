import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import {
  financial_group_members,
  financial_groups,
  users,
} from "../../db/schema";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const financialGroupsRouter = createTRPCRouter({
  getOrCreate: protectedProcedure
    .input(
      z.object({
        email: z.string().email().optional(),
        name: z.string().min(1, "Nome obrigatório"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const clerkId = ctx.userId;

      if (!clerkId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const existingUser = await ctx.db.query.users.findFirst({
        where: eq(users.clerk_id, clerkId),
      });

      let user = existingUser;

      if (!user) {
        const [newUser] = await ctx.db
          .insert(users)
          .values({
            id: uuidv4(),
            clerk_id: clerkId,
            name: input.name,
            email: input.email ?? "",
            onboarding_completed: false,
          })
          .returning();

        user = newUser;
      }

      if (!user) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const existingGroup = await ctx.db.query.financial_groups.findFirst({
        where: eq(financial_groups.owner_id, user.id),
      });

      if (existingGroup) {
        return {
          group: existingGroup,
          wasCreated: false,
          onboardingCompleted: user.onboarding_completed ?? false,
        };
      }

      const groupId = uuidv4();

      const [newGroup] = await ctx.db
        .insert(financial_groups)
        .values({
          id: groupId,
          name: "Financeiro Pessoal",
          owner_id: user.id,
        })
        .returning();

      await ctx.db.insert(financial_group_members).values({
        id: uuidv4(),
        group_id: groupId,
        user_id: user.id,
        role: "owner",
      });

      return { group: newGroup, wasCreated: true, onboardingCompleted: false };
    }),
  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const clerkId = ctx.userId;

    if (!clerkId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    await ctx.db
      .update(users)
      .set({ onboarding_completed: true })
      .where(eq(users.clerk_id, clerkId));

    return { success: true };
  }),
});
