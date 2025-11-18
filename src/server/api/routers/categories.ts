import { and, count, eq, sql } from "drizzle-orm";
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
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        type: z.enum(["expense", "income"]),
        color: z.string().min(1).default("#cccccc"),
        icon: z.string().default(""),
        parent_id: z.string().uuid().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { groupId } = await requireUserAndGroup(ctx.db, ctx.userId);

      // Validate parent exists and belongs to same group if provided
      if (input.parent_id) {
        const parent = await ctx.db.query.categories.findFirst({
          where: and(
            eq(categories.id, input.parent_id),
            eq(categories.group_id, groupId),
          ),
        });

        if (!parent) {
          throw new Error("Parent category not found");
        }
      }

      const categoryId = uuidv4();

      const [newCategory] = await ctx.db
        .insert(categories)
        .values({
          id: categoryId,
          group_id: groupId,
          parent_id: input.parent_id ?? null,
          name: input.name,
          type: input.type,
          color: input.color,
          icon: input.icon,
          is_active: true,
        })
        .returning();

      return newCategory;
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        type: z.enum(["expense", "income"]).optional(),
        color: z.string().min(1).optional(),
        icon: z.string().optional(),
        parent_id: z.string().uuid().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { groupId } = await requireUserAndGroup(ctx.db, ctx.userId);

      // Verify category exists and belongs to group
      const existing = await ctx.db.query.categories.findFirst({
        where: and(eq(categories.id, input.id), eq(categories.group_id, groupId)),
      });

      if (!existing) {
        throw new Error("Category not found");
      }

      // Validate parent exists and belongs to same group if provided
      if (input.parent_id !== undefined && input.parent_id !== null) {
        if (input.parent_id === input.id) {
          throw new Error("Category cannot be its own parent");
        }

        const parent = await ctx.db.query.categories.findFirst({
          where: and(
            eq(categories.id, input.parent_id),
            eq(categories.group_id, groupId),
          ),
        });

        if (!parent) {
          throw new Error("Parent category not found");
        }

        // Check for circular reference: ensure parent is not a descendant
        let currentParentId = parent.parent_id;
        while (currentParentId) {
          if (currentParentId === input.id) {
            throw new Error("Cannot create circular reference");
          }
          const currentParent = await ctx.db.query.categories.findFirst({
            where: eq(categories.id, currentParentId),
          });
          currentParentId = currentParent?.parent_id ?? null;
        }
      }

      const updateData: {
        name?: string;
        type?: "expense" | "income";
        color?: string;
        icon?: string;
        parent_id?: string | null;
        updated_at?: Date;
      } = {
        updated_at: new Date(),
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.type !== undefined) updateData.type = input.type;
      if (input.color !== undefined) updateData.color = input.color;
      if (input.icon !== undefined) updateData.icon = input.icon;
      if (input.parent_id !== undefined) updateData.parent_id = input.parent_id;

      const [updated] = await ctx.db
        .update(categories)
        .set(updateData)
        .where(and(eq(categories.id, input.id), eq(categories.group_id, groupId)))
        .returning();

      return updated;
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { groupId } = await requireUserAndGroup(ctx.db, ctx.userId);

      // Verify category exists and belongs to group
      const existing = await ctx.db.query.categories.findFirst({
        where: and(eq(categories.id, input.id), eq(categories.group_id, groupId)),
      });

      if (!existing) {
        throw new Error("Category not found");
      }

      // Soft delete: toggle is_active
      const [updated] = await ctx.db
        .update(categories)
        .set({
          is_active: sql`NOT ${categories.is_active}`,
          updated_at: new Date(),
        })
        .where(and(eq(categories.id, input.id), eq(categories.group_id, groupId)))
        .returning();

      return updated;
    }),
});
