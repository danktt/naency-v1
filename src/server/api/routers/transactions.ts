import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import {
  bank_accounts,
  categories,
  recurring_transactions,
  transactions,
} from "../../db/schema";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { requireUserAndGroup } from "../utils/getUserAndGroup";

// ==== ENUMS ====

const paymentMethodSchema = z.enum([
  "debit",
  "credit",
  "pix",
  "transfer",
  "cash",
  "boleto",
  "investment",
]);

const transactionTypeSchema = z.enum(["income", "expense", "transfer"]);

const recurrenceTypeSchema = z.enum(["daily", "weekly", "monthly", "yearly"]);

// ==== INPUT SCHEMAS ====

const createTransactionSchema = z.object({
  type: transactionTypeSchema,
  accountId: z.string().uuid("Conta inválida."),
  categoryId: z.string().uuid("Categoria inválida.").optional(),
  amount: z.coerce.number().positive("Informe um valor maior que zero."),
  description: z.string().max(500).optional(),
  date: z.coerce.date(),
  method: paymentMethodSchema,
  attachmentUrl: z.string().url().optional(),
  mode: z.enum(["unique", "installment", "recurring"]).default("unique"),

  // === campos extras ===
  totalInstallments: z.number().int().min(2).optional(),
  recurrenceType: recurrenceTypeSchema.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

const dateRangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

const listTransactionsSchema = z
  .object({
    type: transactionTypeSchema.default("income"),
    limit: z.number().int().min(1).max(100).optional(),
    dateRange: dateRangeSchema.optional(),
  })
  .optional();

// ==== ROUTER ====

export const transactionsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listTransactionsSchema)
    .query(async ({ ctx, input }) => {
      const { groupId } = await requireUserAndGroup(ctx.db, ctx.userId);
      const type = input?.type ?? "income";
      const limit = input?.limit ?? 50;
      const dateRange = input?.dateRange;

      const whereConditions = [
        eq(transactions.group_id, groupId),
        eq(transactions.type, type),
      ];

      if (dateRange) {
        whereConditions.push(gte(transactions.date, dateRange.from));
        whereConditions.push(lte(transactions.date, dateRange.to));
      }

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
        .where(and(...whereConditions))
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

  // ==== CREATE ====
  create: protectedProcedure
    .input(createTransactionSchema)
    .mutation(async ({ ctx, input }) => {
      const { user, groupId } = await requireUserAndGroup(ctx.db, ctx.userId);

      // === validação da conta ===
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

      // === validação da categoria ===
      let categoryNameSnapshot: string | null = null;

      if (input.categoryId) {
        const category = await ctx.db.query.categories.findFirst({
          where: and(
            eq(categories.id, input.categoryId),
            eq(categories.group_id, groupId),
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

      // ============================
      // 🔹 MODO 1: ÚNICA
      // ============================
      if (input.mode === "unique") {
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
            amount: amountValue,
            description: input.description ?? null,
            date: input.date,
            attachment_url: input.attachmentUrl ?? null,
          })
          .returning();

        return transaction;
      }

      // ============================
      // 🔹 MODO 2: PARCELADA
      // ============================
      if (input.mode === "installment") {
        if (!input.totalInstallments || input.totalInstallments < 2) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Informe o número total de parcelas (mínimo 2).",
          });
        }

        const installmentGroupId = uuidv4();
        const created: any[] = [];

        for (let i = 1; i <= input.totalInstallments; i++) {
          const date = new Date(input.date);
          date.setMonth(date.getMonth() + (i - 1));

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
              amount: amountValue,
              description:
                input.description ?? `Parcela ${i}/${input.totalInstallments}`,
              date,
              attachment_url: input.attachmentUrl ?? null,
              installment_group_id: installmentGroupId,
              installment_number: i,
              total_installments: input.totalInstallments,
            })
            .returning();

          created.push(transaction);
        }

        return created;
      }

      // ============================
      // 🔹 MODO 3: FIXA / RECORRENTE
      // ============================
      if (input.mode === "recurring") {
        if (!input.recurrenceType || !input.startDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Informe o tipo e a data de início da recorrência.",
          });
        }

        const [recurring] = await ctx.db
          .insert(recurring_transactions)
          .values({
            id: uuidv4(),
            group_id: groupId,
            user_id: user.id,
            type: input.type,
            method: input.method,
            amount: amountValue,
            account_id: input.accountId,
            category_id: input.categoryId ?? null,
            description: input.description ?? null,
            recurrence_type: input.recurrenceType,
            start_date: input.startDate,
            end_date: input.endDate ?? null,
          })
          .returning();

        // Cria a primeira instância imediata da transação
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
            amount: amountValue,
            description: input.description ?? null,
            date: input.startDate,
            attachment_url: input.attachmentUrl ?? null,
            recurring_id: recurring.id,
          })
          .returning();

        return transaction;
      }

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Modo de transação inválido.",
      });
    }),
});
