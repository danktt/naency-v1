"use client";

import * as React from "react";
import { toast } from "sonner";
import type { TreeNode } from "@/app/(protected)/provisions/_components/types";
import { trpc } from "@/lib/trpc/client";

type GridRow = {
  id: string;
  categoryId: string;
  name: string;
  color?: string | null;
  type: "expense" | "income";
  planned: number;
  realized: number;
  parentId: string | null;
};

type UseCategoryTreeParams = {
  rows: GridRow[];
  selectedType: "expense" | "income";
  periodInput: { month: number; year: number };
  translate: (key: string) => string;
};

export function useCategoryTree({
  rows,
  selectedType,
  periodInput,
  translate,
}: UseCategoryTreeParams) {
  const utils = trpc.useUtils();
  const [expandedCategories, setExpandedCategories] = React.useState<
    Set<string>
  >(new Set());
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [updatingCategoryId, setUpdatingCategoryId] = React.useState<
    string | null
  >(null);

  const requestEdit = React.useCallback((categoryId: string) => {
    setEditingId(categoryId);
  }, []);

  const cancelEdit = React.useCallback(() => {
    setEditingId(null);
  }, []);

  const categoryTree = React.useMemo<TreeNode[]>(() => {
    if (!rows.length) {
      return [];
    }

    const nodes = new Map<string, TreeNode>();
    rows.forEach((row) => {
      nodes.set(row.categoryId, {
        id: row.id,
        categoryId: row.categoryId,
        name: row.name,
        color: row.color,
        type: row.type,
        planned: row.planned,
        realized: row.realized,
        parentId: row.parentId,
        children: [],
      });
    });

    const roots: TreeNode[] = [];
    nodes.forEach((node) => {
      if (node.parentId && nodes.has(node.parentId)) {
        nodes.get(node.parentId)?.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const aggregateNode = (node: TreeNode): { planned: number; realized: number } => {
      if (!node.children.length) {
        return { planned: node.planned, realized: node.realized };
      }

      const totals = node.children.reduce(
        (acc, child) => {
          const childTotals = aggregateNode(child);
          acc.planned += childTotals.planned;
          acc.realized += childTotals.realized;
          return acc;
        },
        { planned: 0, realized: 0 },
      );

      node.planned = Number(totals.planned.toFixed(2));
      node.realized = Number(totals.realized.toFixed(2));

      return { planned: node.planned, realized: node.realized };
    };

    roots.forEach((root) => {
      aggregateNode(root);
    });

    return roots;
  }, [rows]);

  const filteredTree = React.useMemo(() => {
    if (!categoryTree.length) {
      return [];
    }
    return categoryTree.filter((node) => node.type === selectedType);
  }, [categoryTree, selectedType]);

  const toggleCategory = React.useCallback((categoryId: string) => {
    setExpandedCategories((previous) => {
      const next = new Set(previous);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const bulkUpsertMutation = trpc.provisions.bulkUpsert.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.provisions.grid.invalidate({ period: periodInput }),
        utils.provisions.metrics.invalidate(periodInput),
      ]);
      toast.success(translate("toasts.plannedUpdateSuccess"));
    },
    onError: () => {
      toast.error(translate("toasts.plannedUpdateError"));
    },
  });

  const commitEdit = React.useCallback(
    async (categoryId: string, value: number) => {
      try {
        setUpdatingCategoryId(categoryId);
        await bulkUpsertMutation.mutateAsync({
          period: periodInput,
          entries: [{ categoryId, plannedAmount: value }],
        });
      } finally {
        setUpdatingCategoryId((current) =>
          current === categoryId ? null : current,
        );
        setEditingId((current) => (current === categoryId ? null : current));
      }
    },
    [bulkUpsertMutation, periodInput],
  );

  return {
    filteredTree,
    expandedCategories,
    editingId,
    updatingCategoryId,
    toggleCategory,
    requestEdit,
    cancelEdit,
    commitEdit,
  };
}
