import { TRPCError } from "@trpc/server";
import { count, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import {
  type CategoryTemplate,
  DEFAULT_CATEGORY_TEMPLATES,
} from "@/config/defaultCategories";

import { categories, financial_groups, users } from "../../db/schema";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const categoryInputSchema: z.ZodType<CategoryTemplate> = z.lazy(() =>
  z.object({
    name: z.string().min(1),
    type: z.enum(["expense", "income"]),
    color: z.string().min(1),
    icon: z.string().min(1),
    children: z.array(categoryInputSchema).optional(),
  }),
);

export const categoriesRouter = createTRPCRouter({
  importDefaults: protectedProcedure
    .input(
      z
        .object({
          overwrite: z.boolean().optional(),
          categories: z.array(categoryInputSchema).optional(),
        })
        .optional(),
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

      const [{ value: existingCategories }] = await ctx.db
        .select({ value: count() })
        .from(categories)
        .where(eq(categories.group_id, group.id));

      if (existingCategories > 0 && !input?.overwrite) {
        return { inserted: 0, skipped: true };
      }

      if (existingCategories > 0) {
        await ctx.db
          .delete(categories)
          .where(eq(categories.group_id, group.id));
      }

      const categoriesToInsert =
        input?.categories && input.categories.length > 0
          ? input.categories
          : DEFAULT_CATEGORY_TEMPLATES;

      const insertCategoryTree = async (
        category: CategoryTemplate,
        parentId: string | null = null,
      ): Promise<number> => {
        const categoryId = uuidv4();

        await ctx.db.insert(categories).values({
          id: categoryId,
          group_id: group.id,
          parent_id: parentId,
          name: category.name,
          type: category.type,
          color: category.color,
          icon: category.icon,
        });

        let created = 1;

        if (category.children?.length) {
          for (const child of category.children) {
            created += await insertCategoryTree(child, categoryId);
          }
        }

        return created;
      };

      let inserted = 0;

      for (const category of categoriesToInsert) {
        inserted += await insertCategoryTree(category);
      }

      return { inserted, skipped: false };
    }),
});
