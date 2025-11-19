import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { bank_accounts, categories, financial_groups } from "../../db/schema";
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

      // Impede duplicação de contas
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

      // --- NOVA LÓGICA: importar presets UMA ÚNICA VEZ por grupo ---
      // Checa a flag no grupo
      const group = await db.query.financial_groups.findFirst({
        where: eq(financial_groups.id, groupId),
        columns: { presets_imported: true },
      });

      const shouldImportPresets = !group?.presets_imported;

      if (shouldImportPresets) {
        // busca presets do DB
        const presets = await db.query.category_presets.findMany();

        // função que cria árvore: similar ao insertCategoryTree
        const insertCategoryTree = async (
          preset: {
            id: string;
            parent_id: string | null;
            name: string;
            type: "expense" | "income";
            color: string;
            icon: string;
          },
          parentId: string | null = null,
        ): Promise<number> => {
          const categoryId = uuidv4();
          await db.insert(categories).values({
            id: categoryId,
            group_id: groupId,
            parent_id: parentId,
            name: preset.name,
            type: preset.type,
            color: preset.color ?? "#cccccc",
            icon: preset.icon ?? "",
            is_active: true,
          });

          let created = 1;

          // find children presets
          const children = presets.filter((p) => p.parent_id === preset.id);
          for (const child of children) {
            created += await insertCategoryTree(child, categoryId);
          }

          return created;
        };

        // inserir apenas pais root (parent_id === null)
        try {
          for (const rootPreset of presets.filter(
            (p) => p.parent_id === null,
          )) {
            await insertCategoryTree(rootPreset, null);
          }

          // marcar grupo como importado (para nunca mais importar automaticamente)
          await db
            .update(financial_groups)
            .set({ presets_imported: true })
            .where(eq(financial_groups.id, groupId));
        } catch (err) {
          // não queremos que falha na import impeça a criação da conta
          console.error("Erro ao importar presets:", err);
        }
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
