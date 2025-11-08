import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { bank_accounts } from "../../db/schema";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { requireUserAndGroup } from "../utils/getUserAndGroup";

const accountTypeSchema = z.enum(["checking", "credit", "investment"]);

export const accountsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const { groupId } = await requireUserAndGroup(ctx.db, ctx.userId);

    const accounts = await ctx.db.query.bank_accounts.findMany({
      where: eq(bank_accounts.group_id, groupId),
    });

    return accounts.sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
    );
  }),
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
      const { db } = ctx;
      const { groupId } = await requireUserAndGroup(db, ctx.userId);

      // 🔹 Impede duplicação de contas com o mesmo nome dentro do grupo
      const existing = await db.query.bank_accounts.findFirst({
        where: and(
          eq(bank_accounts.group_id, groupId),
          eq(bank_accounts.name, input.name),
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Já existe uma conta com esse nome neste grupo.",
        });
      }

      const balanceValue =
        Number.isFinite(input.initialBalance) && input.initialBalance > 0
          ? (input.initialBalance / 100).toFixed(2)
          : "0";

      const [account] = await db
        .insert(bank_accounts)
        .values({
          id: uuidv4(),
          group_id: groupId,
          name: input.name.trim(),
          type: input.type,
          initial_balance: balanceValue,
          color: input.color ?? "#6366F1",
        })
        .returning();

      if (!account) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro inesperado ao criar conta.",
        });
      }

      return account;
    }),
});
