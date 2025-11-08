import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import {
  bank_accounts,
  financial_groups,
  users,
} from "../../db/schema";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const accountTypeSchema = z.enum(["checking", "credit", "investment"]);

export const accountsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Informe o nome da conta."),
        type: accountTypeSchema,
        initialBalance: z.number().int().nonnegative(),
        color: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const clerkId = ctx.userId;

      if (!clerkId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const user = await ctx.db.query.users.findFirst({
        where: eq(users.clerk_id, clerkId),
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuário não encontrado.",
        });
      }

      const group = await ctx.db.query.financial_groups.findFirst({
        where: eq(financial_groups.owner_id, user.id),
      });

      if (!group) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Grupo financeiro não encontrado.",
        });
      }

      const accountId = uuidv4();

      const balanceInReais =
        Number.isFinite(input.initialBalance) && input.initialBalance > 0
          ? (input.initialBalance / 100).toFixed(2)
          : "0";

      const [account] = await ctx.db
        .insert(bank_accounts)
        .values({
          id: accountId,
          group_id: group.id,
          name: input.name,
          type: input.type,
          initial_balance: balanceInReais,
          color: input.color ?? "#4F46E5",
        })
        .returning();

      if (!account) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Não foi possível criar a conta.",
        });
      }

      return account;
    }),
});


