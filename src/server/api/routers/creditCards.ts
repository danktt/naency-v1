import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { credit_cards } from "../../db/schema";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { requireUserAndGroup } from "../utils/getUserAndGroup";

const currencySchema = z.enum(["BRL", "USD"]);

const createCreditCardSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do cartão."),
  brand: z.string().trim().optional(),
  creditLimit: z.coerce
    .number()
    .min(0, "O limite deve ser maior ou igual a zero."),
  closingDay: z.number().int().min(1).max(31).nullable().optional(),
  dueDay: z.number().int().min(1).max(31).nullable().optional(),
  currency: currencySchema.default("BRL"),
});

const updateCreditCardSchema = createCreditCardSchema.extend({
  id: z.string().uuid("ID inválido."),
});

export const creditCardsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const { groupId } = await requireUserAndGroup(ctx.db, ctx.userId);

    const cards = await ctx.db.query.credit_cards.findMany({
      where: eq(credit_cards.group_id, groupId),
    });

    return cards.sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
    );
  }),

  create: protectedProcedure
    .input(createCreditCardSchema)
    .mutation(async ({ ctx, input }) => {
      const { groupId } = await requireUserAndGroup(ctx.db, ctx.userId);

      const [card] = await ctx.db
        .insert(credit_cards)
        .values({
          id: uuidv4(),
          group_id: groupId,
          name: input.name,
          brand: input.brand ?? null,
          credit_limit: input.creditLimit.toFixed(2),
          available_limit: input.creditLimit.toFixed(2), // Initially available = limit
          closing_day: input.closingDay ?? null,
          due_day: input.dueDay ?? null,
          currency: input.currency,
        })
        .returning();

      if (!card) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao criar cartão de crédito.",
        });
      }

      return card;
    }),

  update: protectedProcedure
    .input(updateCreditCardSchema)
    .mutation(async ({ ctx, input }) => {
      const { groupId } = await requireUserAndGroup(ctx.db, ctx.userId);

      const existing = await ctx.db.query.credit_cards.findFirst({
        where: and(
          eq(credit_cards.id, input.id),
          eq(credit_cards.group_id, groupId),
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cartão não encontrado.",
        });
      }

      // Calculate new available limit based on the difference in credit limit
      // (Simple logic: delta limit is added to available)
      // Or just reset available limit? No, that would be wrong if there are expenses.
      // For now, assuming simple update without complex limit reconciliation logic
      // or just updating the limit.
      // Ideally we should fetch current usage. But since we track available_limit in DB,
      // we can adjust it by the difference.

      const oldLimit = Number(existing.credit_limit);
      const newLimit = input.creditLimit;
      const limitDiff = newLimit - oldLimit;
      const currentAvailable = Number(existing.available_limit);
      const newAvailable = currentAvailable + limitDiff;

      const [updated] = await ctx.db
        .update(credit_cards)
        .set({
          name: input.name,
          brand: input.brand ?? null,
          credit_limit: input.creditLimit.toFixed(2),
          available_limit: newAvailable.toFixed(2),
          closing_day: input.closingDay ?? null,
          due_day: input.dueDay ?? null,
          currency: input.currency,
        })
        .where(
          and(
            eq(credit_cards.id, input.id),
            eq(credit_cards.group_id, groupId),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao atualizar cartão.",
        });
      }

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { groupId } = await requireUserAndGroup(ctx.db, ctx.userId);

      const existing = await ctx.db.query.credit_cards.findFirst({
        where: and(
          eq(credit_cards.id, input.id),
          eq(credit_cards.group_id, groupId),
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cartão não encontrado.",
        });
      }

      await ctx.db
        .delete(credit_cards)
        .where(
          and(
            eq(credit_cards.id, input.id),
            eq(credit_cards.group_id, groupId),
          ),
        );

      return { success: true };
    }),
});
