import { and, count, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import {
  type CategoryTemplate,
  DEFAULT_CATEGORY_TEMPLATES,
} from "@/config/defaultCategories";

import { categories } from "../../db/schema";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { requireUserAndGroup } from "../utils/getUserAndGroup";

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
  list: protectedProcedure
    .input(
      z
        .object({
          type: z.enum(["expense", "income"]).optional(),
          includeInactive: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { groupId } = await requireUserAndGroup(ctx.db, ctx.userId);

      const filters = [eq(categories.group_id, groupId)];

      if (!input?.includeInactive) {
        filters.push(eq(categories.is_active, true));
      }

      if (input?.type) {
        filters.push(eq(categories.type, input.type));
      }

      const where =
        filters.length === 1 ? filters[0] : and(...filters);

      const rows = await ctx.db.query.categories.findMany({
        where,
      });

      return rows.sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
      );
    }),
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
      const { user, groupId } = await requireUserAndGroup(ctx.db, ctx.userId);

      const [{ value: existingCategories }] = await ctx.db
        .select({ value: count() })
        .from(categories)
        .where(eq(categories.group_id, groupId));

      if (existingCategories > 0 && !input?.overwrite) {
        return { inserted: 0, skipped: true };
      }

      if (existingCategories > 0) {
        await ctx.db
          .delete(categories)
          .where(eq(categories.group_id, groupId));
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
          group_id: groupId,
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
