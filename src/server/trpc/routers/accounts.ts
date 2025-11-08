import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import {
  bank_accounts,
  financial_group_members,
  financial_groups,
} from "../../db/schema";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const accountTypeSchema = z.enum(["checking", "credit", "investment"]);

export const accountsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nome da conta é obrigatório."),
        type: accountTypeSchema,
        initialBalance: z.number().nonnegative(),
        color: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;

      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const group = await db.query.financial_groups.findFirst({
        where: eq(financial_groups.owner_id, userId),
      });

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Nenhum grupo financeiro encontrado para este usuário.",
        });
      }

      const existingAccount = await db.query.bank_accounts.findFirst({
        where: and(
          eq(bank_accounts.group_id, group.id),
          eq(bank_accounts.name, input.name),
        ),
      });

      if (existingAccount) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Já existe uma conta com esse nome neste grupo.",
        });
      }

      const [newAccount] = await db
        .insert(bank_accounts)
        .values({
          id: uuidv4(),
          group_id: group.id,
          name: input.name,
          type: input.type,
          initial_balance: input.initialBalance,
          color: input.color ?? "#000000",
        })
        .returning();

      if (!newAccount) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Não foi possível criar a conta.",
        });
      }

      return newAccount;
    }),
});
