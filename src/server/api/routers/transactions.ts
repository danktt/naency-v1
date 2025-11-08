import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { bank_accounts, categories, transactions } from "../../db/schema";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { requireUserAndGroup } from "../utils/getUserAndGroup";

const paymentMethodSchema = z.enum([
  "debit",
  "credit",
  "pix",
  "transfer",
  "cash",
  "boleto",
  "investment",
]);

const transactionTypeSchema = z.enum(["income", "expense"]);

const createTransactionSchema = z.object({
  type: transactionTypeSchema.default("income"),
  accountId: z.string().uuid("Conta inválida."),
  categoryId: z.string().uuid("Categoria inválida.").optional(),
  amount: z.coerce.number().positive("Informe um valor maior que zero."),
  description: z
    .string()
    .max(500, "A descrição pode ter no máximo 500 caracteres.")
    .optional(),
  date: z.coerce.date(),
  method: paymentMethodSchema,
  attachmentUrl: z.string().url("Informe uma URL válida.").optional(),
});

const listTransactionsSchema = z
  .object({
    type: transactionTypeSchema.default("income"),
    limit: z.number().int().min(1).max(100).optional(),
  })
  .optional();

export const transactionsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listTransactionsSchema)
    .query(async ({ ctx, input }) => {
      const { groupId } = await requireUserAndGroup(ctx.db, ctx.userId);
      const type = input?.type ?? "income";
      const limit = input?.limit ?? 50;

      const items = await ctx.db
        .select({
          id: transactions.id,
          description: transactions.description,
          amount: transactions.amount,
          date: transactions.date,
          method: transactions.method,
          categoryId: transactions.category_id,
          categoryNameSnapshot: transactions.category_name_snapshot,
          accountId: transactions.account_id,
          accountName: bank_accounts.name,
          categoryName: categories.name,
        })
        .from(transactions)
        .leftJoin(
          bank_accounts,
          and(
            eq(bank_accounts.id, transactions.account_id),
            eq(bank_accounts.group_id, groupId),
          ),
        )
        .leftJoin(categories, eq(categories.id, transactions.category_id))
        .where(
          and(eq(transactions.group_id, groupId), eq(transactions.type, type)),
        )
        .orderBy(desc(transactions.date))
        .limit(limit);

      return items.map((item) => ({
        id: item.id,
        description: item.description ?? "",
        amount: item.amount,
        date: item.date,
        method: item.method,
        accountId: item.accountId,
        accountName: item.accountName ?? "",
        categoryId: item.categoryId,
        categoryName:
          item.categoryNameSnapshot ?? item.categoryName ?? "Sem categoria",
      }));
    }),

  create: protectedProcedure
    .input(createTransactionSchema)
    .mutation(async ({ ctx, input }) => {
      const { user, groupId } = await requireUserAndGroup(ctx.db, ctx.userId);

      const account = await ctx.db.query.bank_accounts.findFirst({
        where: and(
          eq(bank_accounts.id, input.accountId),
          eq(bank_accounts.group_id, groupId),
        ),
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conta não encontrada.",
        });
      }

      let categoryNameSnapshot: string | null = null;

      if (input.categoryId) {
        const category = await ctx.db.query.categories.findFirst({
          where: and(
            eq(categories.id, input.categoryId),
            eq(categories.group_id, groupId),
            eq(categories.type, input.type),
          ),
        });

        if (!category) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Categoria não encontrada.",
          });
        }

        categoryNameSnapshot = category.name;
      }

      const amountValue = input.amount.toFixed(2);

      const [transaction] = await ctx.db
        .insert(transactions)
        .values({
          id: uuidv4(),
          group_id: groupId,
          account_id: input.accountId,
          category_id: input.categoryId ?? null,
          category_name_snapshot: categoryNameSnapshot,
          user_id: user.id,
          type: input.type,
          method: input.method,
          from_account_id: null,
          to_account_id: null,
          transfer_id: null,
          amount: amountValue,
          description: input.description ?? null,
          date: input.date,
          attachment_url: input.attachmentUrl ?? null,
        })
        .returning();

      if (!transaction) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Não foi possível criar a transação.",
        });
      }

      return transaction;
    }),
});
