import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, lt, lte, sql, sum } from "drizzle-orm";
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

type TransactionRecord = typeof transactions.$inferSelect;

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

const paymentStatusSchema = z.object({
  isPaid: z.boolean().optional(),
  paidAt: z.coerce.date().optional(),
});

const createTransactionSchema = z
  .object({
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
  })
  .merge(paymentStatusSchema);

const updateTransactionSchema = createTransactionSchema.extend({
  id: z.string().uuid("Transação inválida."),
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

const metricsInputSchema = z
  .object({
    dateRange: dateRangeSchema.optional(),
  })
  .optional();

const dashboardSummaryInputSchema = z
  .object({
    referenceDate: z.coerce.date().optional(),
    months: z.number().int().min(1).max(24).optional(),
  })
  .optional();

const toNumber = (value: unknown) => {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
};

const createMonthRange = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  return { start, end };
};

const createTrendStart = (end: Date, months: number) => {
  const offset = Math.max(months - 1, 0);
  return new Date(end.getFullYear(), end.getMonth() - offset, 1);
};

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
          installmentGroupId: transactions.installment_group_id,
          installmentNumber: transactions.installment_number,
          totalInstallments: transactions.total_installments,
          recurringId: transactions.recurring_id,
          isPaid: transactions.is_paid,
          paidAt: transactions.paid_at,
          attachmentUrl: transactions.attachment_url,
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
        installmentGroupId: item.installmentGroupId,
        installmentNumber: item.installmentNumber,
        totalInstallments: item.totalInstallments,
        recurringId: item.recurringId,
        isPaid: item.isPaid ?? false,
        paidAt: item.paidAt,
        attachmentUrl: item.attachmentUrl ?? null,
      }));
    }),

  metrics: protectedProcedure
    .input(metricsInputSchema)
    .query(async ({ ctx, input }) => {
      const { groupId } = await requireUserAndGroup(ctx.db, ctx.userId);
      const dateRange = input?.dateRange;

      const buildConditions = (type: "income" | "expense") => {
        const conditions = [
          eq(transactions.group_id, groupId),
          eq(transactions.type, type),
        ];

        if (dateRange) {
          conditions.push(gte(transactions.date, dateRange.from));
          conditions.push(lte(transactions.date, dateRange.to));
        }

        return and(...conditions);
      };

      const [incomeAggregate] = await ctx.db
        .select({
          total: sum(transactions.amount),
        })
        .from(transactions)
        .where(buildConditions("income"));

      const [expenseAggregate] = await ctx.db
        .select({
          total: sum(transactions.amount),
        })
        .from(transactions)
        .where(buildConditions("expense"));

      const totalIncomes = toNumber(incomeAggregate?.total);
      const totalExpenses = toNumber(expenseAggregate?.total);
      const netBalance = totalIncomes - totalExpenses;

      return {
        totalIncomes,
        totalExpenses,
        netBalance,
      };
    }),

  dashboardSummary: protectedProcedure
    .input(dashboardSummaryInputSchema)
    .query(async ({ ctx, input }) => {
      const { groupId } = await requireUserAndGroup(ctx.db, ctx.userId);
      const now = new Date();
      const referenceDateRaw = input?.referenceDate ?? now;
      const referenceDate =
        referenceDateRaw instanceof Date
          ? referenceDateRaw
          : new Date(referenceDateRaw);
      const { start: monthStart, end: monthEnd } =
        createMonthRange(referenceDate);
      const months = input?.months ?? 6;
      const trendStart = createTrendStart(monthEnd, months);

      const monthConditions = [
        eq(transactions.group_id, groupId),
        gte(transactions.date, monthStart),
        lte(transactions.date, monthEnd),
      ];

      const [
        [monthIncomeAggregate],
        [monthExpenseAggregate],
        [pendingPaymentsRow],
        [previousIncomeAggregate],
        [previousExpenseAggregate],
        monthlyTrendResult,
        expenseDistributionRows,
        [paymentStatusRow],
      ] = await Promise.all([
        ctx.db
          .select({
            total: sum(transactions.amount),
          })
          .from(transactions)
          .where(and(...monthConditions, eq(transactions.type, "income"))),
        ctx.db
          .select({
            total: sum(transactions.amount),
          })
          .from(transactions)
          .where(and(...monthConditions, eq(transactions.type, "expense"))),
        ctx.db
          .select({
            count: sql<number>`count(*)`,
          })
          .from(transactions)
          .where(and(...monthConditions, eq(transactions.is_paid, false))),
        ctx.db
          .select({
            total: sum(transactions.amount),
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.group_id, groupId),
              eq(transactions.type, "income"),
              lt(transactions.date, monthStart),
            ),
          ),
        ctx.db
          .select({
            total: sum(transactions.amount),
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.group_id, groupId),
              eq(transactions.type, "expense"),
              lt(transactions.date, monthStart),
            ),
          ),
        ctx.db.execute(
          sql<{
            month: string;
            incomes: string | number | null;
            expenses: string | number | null;
          }>`
            SELECT
              TO_CHAR(DATE_TRUNC('month', t.date), 'YYYY-MM') AS month,
              SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) AS incomes,
              SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS expenses
            FROM transactions t
            WHERE
              t.group_id = ${groupId}
              AND t.date >= ${trendStart}
              AND t.date <= ${monthEnd}
            GROUP BY DATE_TRUNC('month', t.date)
            ORDER BY DATE_TRUNC('month', t.date)
          `,
        ),
        ctx.db
          .select({
            categoryId: transactions.category_id,
            categoryNameSnapshot: transactions.category_name_snapshot,
            categoryName: categories.name,
            categoryColor: categories.color,
            total: sum(transactions.amount),
          })
          .from(transactions)
          .leftJoin(
            categories,
            and(
              eq(categories.id, transactions.category_id),
              eq(categories.group_id, groupId),
            ),
          )
          .where(and(...monthConditions, eq(transactions.type, "expense")))
          .groupBy(
            transactions.category_id,
            transactions.category_name_snapshot,
            categories.name,
            categories.color,
          ),
        ctx.db
          .select({
            onTime: sql<number>`SUM(CASE WHEN ${transactions.is_paid} = true AND (${transactions.paid_at} IS NULL OR ${transactions.paid_at} <= ${transactions.date}) THEN 1 ELSE 0 END)`,
            late: sql<number>`SUM(CASE WHEN ${transactions.is_paid} = true AND ${transactions.paid_at} IS NOT NULL AND ${transactions.paid_at} > ${transactions.date} THEN 1 ELSE 0 END)`,
            pending: sql<number>`SUM(CASE WHEN ${transactions.is_paid} = false THEN 1 ELSE 0 END)`,
            overdue: sql<number>`SUM(CASE WHEN ${transactions.is_paid} = false AND ${transactions.date} < ${now} THEN 1 ELSE 0 END)`,
          })
          .from(transactions)
          .where(and(...monthConditions)),
      ]);

      const monthIncomes = toNumber(monthIncomeAggregate?.total);
      const monthExpenses = toNumber(monthExpenseAggregate?.total);
      const monthBalance = monthIncomes - monthExpenses;

      const previousIncomes = toNumber(previousIncomeAggregate?.total);
      const previousExpenses = toNumber(previousExpenseAggregate?.total);
      const accumulatedBalance =
        previousIncomes - previousExpenses + monthBalance;

      const pendingPaymentsCount = toNumber(pendingPaymentsRow?.count);

      const monthlyTrendMap = new Map<
        string,
        { incomes: number; expenses: number }
      >();
      const monthlyTrendRows = monthlyTrendResult.rows as Array<{
        month: string;
        incomes: string | number | null;
        expenses: string | number | null;
      }>;

      monthlyTrendRows.forEach((row) => {
        monthlyTrendMap.set(row.month, {
          incomes: toNumber(row.incomes),
          expenses: toNumber(row.expenses),
        });
      });

      const monthlyTrend = [];
      for (let index = 0; index < months; index += 1) {
        const monthDate = new Date(
          trendStart.getFullYear(),
          trendStart.getMonth() + index,
          1,
        );
        if (monthDate > monthEnd) {
          break;
        }

        const monthKey = `${monthDate.getFullYear()}-${String(
          monthDate.getMonth() + 1,
        ).padStart(2, "0")}`;
        const trendEntry = monthlyTrendMap.get(monthKey) ?? {
          incomes: 0,
          expenses: 0,
        };

        monthlyTrend.push({
          month: monthKey,
          monthStart: monthDate.toISOString(),
          incomes: trendEntry.incomes,
          expenses: trendEntry.expenses,
        });
      }

      const expenseDistribution = expenseDistributionRows
        .map((row) => ({
          categoryId: row.categoryId,
          label: row.categoryNameSnapshot ?? row.categoryName ?? null,
          color: row.categoryColor ?? "#9ca3af",
          value: toNumber(row.total),
          isUncategorized: !row.categoryId,
        }))
        .filter((item) => item.value > 0);

      const totalDistributionValue = expenseDistribution.reduce(
        (total, item) => total + item.value,
        0,
      );

      const distribution = expenseDistribution.map((item) => ({
        ...item,
        percentage:
          totalDistributionValue > 0
            ? (item.value / totalDistributionValue) * 100
            : 0,
      }));

      const paymentStatus = {
        onTime: toNumber(paymentStatusRow?.onTime),
        late: toNumber(paymentStatusRow?.late),
        pending: toNumber(paymentStatusRow?.pending),
        overdue: toNumber(paymentStatusRow?.overdue),
      };

      return {
        referenceDate: referenceDate.toISOString(),
        monthStart: monthStart.toISOString(),
        monthEnd: monthEnd.toISOString(),
        snapshot: {
          totalIncomes: monthIncomes,
          totalExpenses: monthExpenses,
          monthBalance,
          accumulatedBalance,
          pendingPaymentsCount,
        },
        monthlyTrend,
        expenseDistribution: distribution,
        paymentStatus,
      };
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
      const inferredPaidFlag =
        input.mode === "unique" && input.type === "income";
      const isPaid = input.isPaid ?? Boolean(inferredPaidFlag);
      const paidAtValue =
        isPaid && (input.paidAt ?? input.date)
          ? (input.paidAt ?? input.date)
          : null;

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
            is_paid: isPaid,
            paid_at: paidAtValue ?? null,
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
        const created: TransactionRecord[] = [];

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
              is_paid: input.isPaid ?? false,
              paid_at: input.isPaid && input.paidAt ? input.paidAt : null,
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
            is_paid: input.isPaid ?? false,
            paid_at: input.isPaid && input.paidAt ? input.paidAt : null,
          })
          .returning();

        return transaction;
      }

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Modo de transação inválido.",
      });
    }),

  // ==== UPDATE ====
  update: protectedProcedure
    .input(updateTransactionSchema)
    .mutation(async ({ ctx, input }) => {
      const { groupId } = await requireUserAndGroup(ctx.db, ctx.userId);

      const existing = await ctx.db.query.transactions.findFirst({
        where: and(
          eq(transactions.id, input.id),
          eq(transactions.group_id, groupId),
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transação não encontrada.",
        });
      }

      if (existing.type !== input.type) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não é possível alterar o tipo da transação.",
        });
      }

      const inferredMode = existing.installment_group_id
        ? "installment"
        : existing.recurring_id
          ? "recurring"
          : "unique";

      if (input.mode !== inferredMode) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não é possível alterar o modo da transação.",
        });
      }

      if (inferredMode !== "unique") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Edição disponível apenas para transações únicas no momento.",
        });
      }

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

      const nextCategoryId =
        input.categoryId !== undefined
          ? input.categoryId
          : existing.category_id;

      let categoryNameSnapshot = existing.category_name_snapshot;

      if (input.categoryId !== undefined) {
        if (!input.categoryId) {
          categoryNameSnapshot = null;
        } else {
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
      }

      const amountValue = input.amount.toFixed(2);
      const inferredPaidFlag =
        input.mode === "unique" && input.type === "income";
      const isPaid = input.isPaid ?? Boolean(inferredPaidFlag);
      const paidAtValue =
        isPaid && (input.paidAt ?? input.date)
          ? (input.paidAt ?? input.date)
          : null;

      const [updated] = await ctx.db
        .update(transactions)
        .set({
          account_id: input.accountId,
          category_id: nextCategoryId ?? null,
          category_name_snapshot: categoryNameSnapshot,
          method: input.method,
          amount: amountValue,
          description: input.description ?? null,
          date: input.date,
          attachment_url: input.attachmentUrl ?? null,
          is_paid: isPaid,
          paid_at: paidAtValue ?? null,
        })
        .where(
          and(
            eq(transactions.id, input.id),
            eq(transactions.group_id, groupId),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Não foi possível atualizar a transação.",
        });
      }

      return updated;
    }),
});
