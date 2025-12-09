import { TRPCError } from "@trpc/server";
import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lt,
  lte,
  ne,
  or,
  type SQL,
  sql,
  sum,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import {
  bank_accounts,
  categories,
  credit_cards,
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

const baseTransactionSchema = z
  .object({
    type: transactionTypeSchema,
    accountId: z.string().uuid("Conta inválida.").optional(),
    creditCardId: z.string().uuid("Cartão inválido.").optional(),
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

const transactionRefinement = (
  data: z.infer<typeof baseTransactionSchema>,
  ctx: z.RefinementCtx,
) => {
  if (data.method === "credit") {
    if (!data.creditCardId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["creditCardId"],
        message: "Informe o cartão de crédito.",
      });
    }
  } else {
    if (!data.accountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["accountId"],
        message: "Informe a conta bancária.",
      });
    }
  }

  if (data.mode === "recurring") {
    if (!data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startDate"],
        message: "Informe a data de início da recorrência.",
      });
    }
    if (!data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "Informe a data de término da recorrência.",
      });
    }
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "A data de término deve ser posterior à data de início.",
      });
    }
  }
};

const createTransactionSchema = baseTransactionSchema.superRefine(
  transactionRefinement,
);

const updateTransactionSchema = baseTransactionSchema
  .extend({
    id: z.string().uuid("Transação inválida."),
  })
  .superRefine(transactionRefinement);

const dateRangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

const listTransactionsSchema = z
  .object({
    type: transactionTypeSchema.default("income"),
    limit: z.number().int().min(1).max(100).optional(),
    dateRange: dateRangeSchema.optional(),
    excludeCreditCard: z.boolean().optional(),
  })
  .optional();

const metricsInputSchema = z
  .object({
    dateRange: dateRangeSchema.optional(),
    excludeCreditCard: z.boolean().optional(),
  })
  .optional();

const listTransfersInputSchema = z
  .object({
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2100),
    accountId: z.string().uuid("Conta inválida.").optional(),
  })
  .optional();

const transferBaseSchema = z
  .object({
    date: z.coerce.date(),
    fromAccountId: z.string().uuid("Conta de origem inválida."),
    toAccountId: z.string().uuid("Conta de destino inválida."),
    amount: z.coerce.number(),
    description: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (!(data.date instanceof Date) || Number.isNaN(data.date.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["date"],
        message: "Informe uma data válida.",
      });
    }

    if (!Number.isFinite(data.amount) || data.amount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amount"],
        message: "Informe um valor maior que zero.",
      });
    }
  })
  .refine(
    (data) => data.fromAccountId !== data.toAccountId,
    "As contas de origem e destino devem ser diferentes.",
  );

const createTransferSchema = transferBaseSchema;
const updateTransferSchema = transferBaseSchema.and(
  z.object({
    id: z.string().uuid("Transferência inválida."),
  }),
);

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
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid("Transação inválida."),
        type: transactionTypeSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { groupId } = await requireUserAndGroup(ctx.db, ctx.userId);

      const existing = await ctx.db.query.transactions.findFirst({
        where: and(
          eq(transactions.id, input.id),
          eq(transactions.group_id, groupId),
          eq(transactions.type, input.type),
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transação não encontrada.",
        });
      }

      await ctx.db
        .delete(transactions)
        .where(
          and(
            eq(transactions.id, input.id),
            eq(transactions.group_id, groupId),
            eq(transactions.type, input.type),
          ),
        );

      return { success: true };
    }),

  updatePaymentStatus: protectedProcedure
    .input(
      z
        .object({
          id: z.string().uuid("Transação inválida."),
          type: transactionTypeSchema,
        })
        .merge(paymentStatusSchema),
    )
    .mutation(async ({ ctx, input }) => {
      const { groupId } = await requireUserAndGroup(ctx.db, ctx.userId);

      const existing = await ctx.db.query.transactions.findFirst({
        where: and(
          eq(transactions.id, input.id),
          eq(transactions.group_id, groupId),
          eq(transactions.type, input.type),
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transação não encontrada.",
        });
      }

      const nextPaidAt =
        (input.isPaid ?? existing.is_paid)
          ? (input.paidAt ?? existing.paid_at ?? new Date())
          : null;

      await ctx.db
        .update(transactions)
        .set({
          is_paid: input.isPaid ?? existing.is_paid ?? false,
          paid_at: nextPaidAt,
        })
        .where(
          and(
            eq(transactions.id, input.id),
            eq(transactions.group_id, groupId),
            eq(transactions.type, input.type),
          ),
        );

      return { success: true };
    }),

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
      if (type === "expense") {
        whereConditions.push(ne(transactions.method, "credit"));
      }
      const fromAccount = alias(bank_accounts, "from_account");
      const toAccount = alias(bank_accounts, "to_account");

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
          creditCardId: transactions.credit_card_id,
          creditCardName: credit_cards.name,
          fromAccountId: transactions.from_account_id,
          toAccountId: transactions.to_account_id,
          fromAccountName: fromAccount.name,
          toAccountName: toAccount.name,
          transferId: transactions.transfer_id,
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
        .leftJoin(
          credit_cards,
          and(
            eq(credit_cards.id, transactions.credit_card_id),
            eq(credit_cards.group_id, groupId),
          ),
        )
        .leftJoin(categories, eq(categories.id, transactions.category_id))
        .leftJoin(
          fromAccount,
          and(
            eq(fromAccount.id, transactions.from_account_id),
            eq(fromAccount.group_id, groupId),
          ),
        )
        .leftJoin(
          toAccount,
          and(
            eq(toAccount.id, transactions.to_account_id),
            eq(toAccount.group_id, groupId),
          ),
        )
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
        creditCardId: item.creditCardId,
        creditCardName: item.creditCardName ?? "",
        fromAccountId: item.fromAccountId,
        toAccountId: item.toAccountId,
        fromAccountName: item.fromAccountName ?? null,
        toAccountName: item.toAccountName ?? null,
        transferId: item.transferId,
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
      const excludeCreditCard = input?.excludeCreditCard;

      const buildConditions = (type: "income" | "expense") => {
        const conditions = [
          eq(transactions.group_id, groupId),
          eq(transactions.type, type),
        ];

        if (dateRange) {
          conditions.push(gte(transactions.date, dateRange.from));
          conditions.push(lte(transactions.date, dateRange.to));
        }

        if (excludeCreditCard) {
          conditions.push(ne(transactions.method, "credit"));
        }

        conditions.push(eq(transactions.is_paid, true));

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

  listTransfers: protectedProcedure
    .input(listTransfersInputSchema)
    .query(async ({ ctx, input }) => {
      const { groupId } = await requireUserAndGroup(ctx.db, ctx.userId);

      const now = new Date();
      const month = input?.month ?? now.getMonth() + 1;
      const year = input?.year ?? now.getFullYear();

      const { start: monthStart, end: monthEnd } = createMonthRange(
        new Date(year, month - 1, 1),
      );

      const conditions = [
        eq(transactions.group_id, groupId),
        eq(transactions.type, "transfer"),
        gte(transactions.date, monthStart),
        lte(transactions.date, monthEnd),
        input?.accountId
          ? or(
              eq(transactions.from_account_id, input.accountId),
              eq(transactions.to_account_id, input.accountId),
            )
          : undefined,
      ].filter((condition): condition is SQL => Boolean(condition));

      const whereClause = and(...conditions);

      const fromAccount = alias(bank_accounts, "from_account");
      const toAccount = alias(bank_accounts, "to_account");

      const rows = await ctx.db
        .select({
          id: transactions.id,
          date: transactions.date,
          amount: transactions.amount,
          description: transactions.description,
          fromAccountId: transactions.from_account_id,
          toAccountId: transactions.to_account_id,
          fromAccountName: fromAccount.name,
          toAccountName: toAccount.name,
          isPaid: transactions.is_paid,
          paidAt: transactions.paid_at,
        })
        .from(transactions)
        .leftJoin(
          fromAccount,
          and(
            eq(fromAccount.id, transactions.from_account_id),
            eq(fromAccount.group_id, groupId),
          ),
        )
        .leftJoin(
          toAccount,
          and(
            eq(toAccount.id, transactions.to_account_id),
            eq(toAccount.group_id, groupId),
          ),
        )
        .where(whereClause)
        .orderBy(desc(transactions.date));

      return rows.map((row) => ({
        id: row.id,
        date: row.date,
        amount: toNumber(row.amount),
        description: row.description ?? "",
        fromAccountId: row.fromAccountId,
        toAccountId: row.toAccountId,
        fromAccountName: row.fromAccountName ?? "",
        toAccountName: row.toAccountName ?? "",
        isPaid: row.isPaid ?? false,
        paidAt: row.paidAt,
      }));
    }),

  createTransfer: protectedProcedure
    .input(createTransferSchema)
    .mutation(async ({ ctx, input }) => {
      const { user, groupId } = await requireUserAndGroup(ctx.db, ctx.userId);

      const accounts = await ctx.db.query.bank_accounts.findMany({
        where: and(
          eq(bank_accounts.group_id, groupId),
          inArray(bank_accounts.id, [input.fromAccountId, input.toAccountId]),
        ),
      });

      if (accounts.length !== 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Selecione contas válidas do seu grupo.",
        });
      }

      const transferId = uuidv4();
      const [transfer] = await ctx.db
        .insert(transactions)
        .values({
          id: uuidv4(),
          group_id: groupId,
          user_id: user.id,
          type: "transfer",
          method: "transfer",
          account_id: input.fromAccountId,
          from_account_id: input.fromAccountId,
          to_account_id: input.toAccountId,
          transfer_id: transferId,
          amount: input.amount.toFixed(2),
          description: input.description ?? null,
          date: input.date,
          is_paid: true,
          paid_at: input.date,
        })
        .returning();

      if (!transfer) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Não foi possível criar a transferência.",
        });
      }

      return transfer;
    }),

  updateTransfer: protectedProcedure
    .input(updateTransferSchema)
    .mutation(async ({ ctx, input }) => {
      const { groupId } = await requireUserAndGroup(ctx.db, ctx.userId);

      const existing = await ctx.db.query.transactions.findFirst({
        where: and(
          eq(transactions.id, input.id),
          eq(transactions.group_id, groupId),
        ),
      });

      if (!existing || existing.type !== "transfer") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transferência não encontrada.",
        });
      }

      const accounts = await ctx.db.query.bank_accounts.findMany({
        where: and(
          eq(bank_accounts.group_id, groupId),
          inArray(bank_accounts.id, [input.fromAccountId, input.toAccountId]),
        ),
      });

      if (accounts.length !== 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Selecione contas válidas do seu grupo.",
        });
      }

      const [updated] = await ctx.db
        .update(transactions)
        .set({
          account_id: input.fromAccountId,
          from_account_id: input.fromAccountId,
          to_account_id: input.toAccountId,
          amount: input.amount.toFixed(2),
          description: input.description ?? null,
          date: input.date,
          paid_at: input.date,
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
          message: "Não foi possível atualizar a transferência.",
        });
      }

      return updated;
    }),

  deleteTransfer: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid("Transferência inválida."),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { groupId } = await requireUserAndGroup(ctx.db, ctx.userId);

      const existing = await ctx.db.query.transactions.findFirst({
        where: and(
          eq(transactions.id, input.id),
          eq(transactions.group_id, groupId),
        ),
      });

      if (!existing || existing.type !== "transfer") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transferência não encontrada.",
        });
      }

      await ctx.db
        .delete(transactions)
        .where(
          and(
            eq(transactions.id, input.id),
            eq(transactions.group_id, groupId),
          ),
        );

      return { success: true };
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
        // Unused legacy aggregates
        [],
        [],
        monthlyTrendResult,
        expenseDistributionRows,
        [paymentStatusIncomeRow],
        [paymentStatusExpenseRow],
        [initialBalanceAggregate],
        [cashFlowResult],
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
          .where(
            and(
              ...monthConditions,
              eq(transactions.type, "expense"),
              isNotNull(transactions.account_id),
            ),
          ),
        ctx.db
          .select({
            count: sql<number>`count(*)`,
          })
          .from(transactions)
          .where(
            and(
              ...monthConditions,
              eq(transactions.is_paid, false),
              isNotNull(transactions.account_id),
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
              isNotNull(transactions.account_id),
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
              SUM(CASE WHEN t.type = 'expense' AND t.account_id IS NOT NULL THEN t.amount ELSE 0 END) AS expenses
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
          .where(
            and(
              ...monthConditions,
              eq(transactions.type, "expense"),
              isNotNull(transactions.account_id),
            ),
          )
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
          .where(and(...monthConditions, eq(transactions.type, "income"))),
        ctx.db
          .select({
            onTime: sql<number>`SUM(CASE WHEN ${transactions.is_paid} = true AND (${transactions.paid_at} IS NULL OR ${transactions.paid_at} <= ${transactions.date}) THEN 1 ELSE 0 END)`,
            late: sql<number>`SUM(CASE WHEN ${transactions.is_paid} = true AND ${transactions.paid_at} IS NOT NULL AND ${transactions.paid_at} > ${transactions.date} THEN 1 ELSE 0 END)`,
            pending: sql<number>`SUM(CASE WHEN ${transactions.is_paid} = false THEN 1 ELSE 0 END)`,
            overdue: sql<number>`SUM(CASE WHEN ${transactions.is_paid} = false AND ${transactions.date} < ${now} THEN 1 ELSE 0 END)`,
          })
          .from(transactions)
          .where(
            and(
              ...monthConditions,
              eq(transactions.type, "expense"),
              isNotNull(transactions.account_id),
            ),
          ),
        ctx.db
          .select({
            total: sum(bank_accounts.initial_balance),
          })
          .from(bank_accounts)
          .where(eq(bank_accounts.group_id, groupId)),
        // Calculate actual cash balance (Bank Accounts)
        ctx.db
          .select({
            totalIncomes: sql<number>`SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END)`,
            totalExpenses: sql<number>`SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END)`,
            totalTransfersIn: sql<number>`SUM(CASE WHEN ${transactions.type} = 'transfer' AND ${transactions.to_account_id} IS NOT NULL THEN ${transactions.amount} ELSE 0 END)`, // This might double count if not careful, but simplified:
            // Actually, for global balance, transfers within the group cancel out IF both accounts are in the group.
            // But we can just sum all credits and debits to accounts.
            netFlow: sql<number>`
              SUM(
                CASE 
                  WHEN ${transactions.type} = 'income' AND ${transactions.account_id} IS NOT NULL THEN ${transactions.amount}
                  WHEN ${transactions.type} = 'expense' AND ${transactions.account_id} IS NOT NULL THEN -${transactions.amount}
                  ELSE 0
                END
              )
            `,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.group_id, groupId),
              eq(transactions.is_paid, true),
              lte(transactions.date, now), // Balance up to NOW? Or up to reference date? Usually Balance is "Current".
              // If referenceDate is future, we might want projected. If referenceDate is now, it's current.
              // Let's use referenceDate to be consistent with the view.
            ),
          ),
      ]);

      const monthIncomes = toNumber(monthIncomeAggregate?.total);
      const monthExpenses = toNumber(monthExpenseAggregate?.total);
      const monthBalance = monthIncomes - monthExpenses;

      const initialBalance = toNumber(initialBalanceAggregate?.total);
      const totalNetFlow = toNumber(cashFlowResult?.netFlow);

      // Accumulated Balance = Initial Bank Balance + Net Cash Flow (paid incomes - paid expenses)
      const accumulatedBalance = initialBalance + totalNetFlow;

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

      const normalizePaymentStatus = (
        row:
          | {
              onTime: number | null;
              late: number | null;
              pending: number | null;
              overdue: number | null;
            }
          | undefined,
      ) => ({
        onTime: toNumber(row?.onTime),
        late: toNumber(row?.late),
        pending: toNumber(row?.pending),
        overdue: toNumber(row?.overdue),
      });

      const paymentStatus = {
        incomes: normalizePaymentStatus(paymentStatusIncomeRow),
        expenses: normalizePaymentStatus(paymentStatusExpenseRow),
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

      // === validação da conta ou cartão ===
      if (input.method === "credit") {
        if (!input.creditCardId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Informe o cartão de crédito.",
          });
        }
        const card = await ctx.db.query.credit_cards.findFirst({
          where: and(
            eq(credit_cards.id, input.creditCardId),
            eq(credit_cards.group_id, groupId),
          ),
        });
        if (!card) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cartão de crédito não encontrado.",
          });
        }
      } else {
        if (!input.accountId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Informe a conta bancária.",
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

      const accountId = input.method === "credit" ? null : input.accountId;
      const creditCardId =
        input.method === "credit" ? input.creditCardId : null;

      // ============================
      // 🔹 MODO 1: ÚNICA
      // ============================
      if (input.mode === "unique") {
        const [transaction] = await ctx.db
          .insert(transactions)
          .values({
            id: uuidv4(),
            group_id: groupId,
            account_id: accountId,
            credit_card_id: creditCardId,
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

        // Divide o valor total pelo número de parcelas
        const installmentAmount = (
          input.amount / input.totalInstallments
        ).toFixed(2);

        // Obtém o dia do mês da data inicial para manter o mesmo dia em todas as parcelas
        const initialDay = input.date.getDate();

        for (let i = 1; i <= input.totalInstallments; i++) {
          const date = new Date(input.date);
          date.setMonth(date.getMonth() + (i - 1));
          // Garante que o dia do mês seja mantido (ex: dia 10)
          date.setDate(initialDay);

          const [transaction] = await ctx.db
            .insert(transactions)
            .values({
              id: uuidv4(),
              group_id: groupId,
              account_id: accountId,
              credit_card_id: creditCardId,
              category_id: input.categoryId ?? null,
              category_name_snapshot: categoryNameSnapshot,
              user_id: user.id,
              type: input.type,
              method: input.method,
              amount: installmentAmount,
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
        if (!input.recurrenceType || !input.startDate || !input.endDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Informe o tipo, data de início e data de término da recorrência.",
          });
        }

        if (input.endDate < input.startDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A data de término deve ser posterior à data de início.",
          });
        }

        const recurringId = uuidv4();
        const createdTransactions: TransactionRecord[] = [];

        // Gera todas as datas de recorrência baseado no tipo
        const dates: Date[] = [];
        const currentDate = new Date(input.startDate);
        currentDate.setHours(0, 0, 0, 0);

        const endDate = new Date(input.endDate);
        endDate.setHours(23, 59, 59, 999);

        while (currentDate <= endDate) {
          dates.push(new Date(currentDate));

          // Incrementa a data baseado no tipo de recorrência
          switch (input.recurrenceType) {
            case "daily":
              currentDate.setDate(currentDate.getDate() + 1);
              break;
            case "weekly":
              currentDate.setDate(currentDate.getDate() + 7);
              break;
            case "monthly":
              currentDate.setMonth(currentDate.getMonth() + 1);
              break;
            case "yearly":
              currentDate.setFullYear(currentDate.getFullYear() + 1);
              break;
          }
        }

        // Cria registro na tabela recurring_transactions
        await ctx.db.insert(recurring_transactions).values({
          id: recurringId,
          group_id: groupId,
          user_id: user.id,
          type: input.type,
          method: input.method,
          amount: amountValue,
          account_id: accountId ?? "",
          category_id: input.categoryId ?? null,
          description: input.description ?? null,
          recurrence_type: input.recurrenceType,
          start_date: input.startDate,
          end_date: input.endDate,
        });

        // Cria todas as transações de uma vez
        for (const date of dates) {
          const [transaction] = await ctx.db
            .insert(transactions)
            .values({
              id: uuidv4(),
              group_id: groupId,
              account_id: accountId,
              credit_card_id: creditCardId,
              category_id: input.categoryId ?? null,
              category_name_snapshot: categoryNameSnapshot,
              user_id: user.id,
              type: input.type,
              method: input.method,
              amount: amountValue,
              description: input.description ?? null,
              date,
              attachment_url: input.attachmentUrl ?? null,
              recurring_id: recurringId,
              is_paid: input.isPaid ?? false,
              paid_at: input.isPaid && input.paidAt ? input.paidAt : null,
            })
            .returning();

          createdTransactions.push(transaction);
        }

        return createdTransactions;
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

      if (input.method === "credit") {
        if (!input.creditCardId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Informe o cartão de crédito.",
          });
        }
        const card = await ctx.db.query.credit_cards.findFirst({
          where: and(
            eq(credit_cards.id, input.creditCardId),
            eq(credit_cards.group_id, groupId),
          ),
        });
        if (!card) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cartão de crédito não encontrado.",
          });
        }
      } else {
        if (!input.accountId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Informe a conta bancária.",
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

      const accountId = input.method === "credit" ? null : input.accountId;
      const creditCardId =
        input.method === "credit" ? input.creditCardId : null;

      const [updated] = await ctx.db
        .update(transactions)
        .set({
          account_id: accountId,
          credit_card_id: creditCardId,
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
