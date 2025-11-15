import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { bank_accounts } from "../../db/schema";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { requireUserAndGroup } from "../utils/getUserAndGroup";

const accountTypeSchema = z.enum(["checking", "credit", "investment"]);
const currencySchema = z.enum(["BRL", "USD"]);
const colorSchema = z
  .string()
  .regex(
    /^#(?:[0-9a-fA-F]{3}){1,2}$/,
    "Informe uma cor em formato hexadecimal.",
  );

const DEFAULT_ACCOUNT_COLOR = "#6366F1";

const accountPayloadSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da conta."),
  type: accountTypeSchema,
  initialBalance: z.coerce
    .number()
    .refine((value) => Number.isFinite(value), {
      message: "Informe um valor numérico válido.",
    })
    .refine((value) => value >= 0, {
      message: "O saldo inicial não pode ser negativo.",
    }),
  currency: currencySchema,
  color: colorSchema.default(DEFAULT_ACCOUNT_COLOR),
});

const formatBalance = (value: number) =>
  Number.isFinite(value) ? value.toFixed(2) : "0.00";

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
    .input(accountPayloadSchema)
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

      const balanceValue = formatBalance(input.initialBalance);

      const [account] = await db
        .insert(bank_accounts)
        .values({
          id: uuidv4(),
          group_id: groupId,
          name: input.name.trim(),
          type: input.type,
          initial_balance: balanceValue,
          currency: input.currency,
          color: input.color ?? DEFAULT_ACCOUNT_COLOR,
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
  update: protectedProcedure
    .input(
      accountPayloadSchema.extend({
        id: z.string().uuid("Identificador inválido."),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const { groupId } = await requireUserAndGroup(db, ctx.userId);

      const account = await db.query.bank_accounts.findFirst({
        where: and(
          eq(bank_accounts.id, input.id),
          eq(bank_accounts.group_id, groupId),
        ),
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conta bancária não encontrada.",
        });
      }

      const conflicting = await db.query.bank_accounts.findFirst({
        where: and(
          eq(bank_accounts.group_id, groupId),
          eq(bank_accounts.name, input.name.trim()),
        ),
      });

      if (conflicting && conflicting.id !== input.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Já existe uma conta com esse nome neste grupo.",
        });
      }

      const [updated] = await db
        .update(bank_accounts)
        .set({
          name: input.name.trim(),
          type: input.type,
          initial_balance: formatBalance(input.initialBalance),
          currency: input.currency,
          color: input.color ?? DEFAULT_ACCOUNT_COLOR,
        })
        .where(
          and(
            eq(bank_accounts.id, input.id),
            eq(bank_accounts.group_id, groupId),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro inesperado ao atualizar a conta.",
        });
      }

      return updated;
    }),
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid("Identificador inválido."),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const { groupId } = await requireUserAndGroup(db, ctx.userId);

      const account = await db.query.bank_accounts.findFirst({
        where: and(
          eq(bank_accounts.id, input.id),
          eq(bank_accounts.group_id, groupId),
        ),
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conta bancária não encontrada.",
        });
      }

      try {
        await db
          .delete(bank_accounts)
          .where(
            and(
              eq(bank_accounts.id, input.id),
              eq(bank_accounts.group_id, groupId),
            ),
          );
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Não foi possível deletar a conta. Verifique se existem transações associadas.",
          cause: error,
        });
      }

      return { success: true };
    }),
});
