"use client";

import * as React from "react";

export type CategoryNode = {
  id: string;
  name: string;
  type: "expense" | "income";
  color: string | null;
  icon: string | null;
  parent_id: string | null;
  is_active: boolean;
  created_at: Date | null;
  updated_at: Date | null;
  children: CategoryNode[];
};

type CategoryRow = {
  id: string;
  name: string;
  type: "expense" | "income";
  color: string | null;
  icon: string | null;
  parent_id: string | null;
  is_active: boolean;
  created_at: Date | null;
  updated_at: Date | null;
};

type UseCategoryTreeParams = {
  categories: CategoryRow[];
  selectedType: "expense" | "income";
  includeInactive?: boolean;
};

export function useCategoryTree({
  categories,
  selectedType,
  includeInactive = false,
}: UseCategoryTreeParams) {
  const [expandedCategories, setExpandedCategories] = React.useState<
    Set<string>
  >(new Set());

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

  const expandAll = React.useCallback(() => {
    const allIds = new Set(categories.map((cat) => cat.id));
    setExpandedCategories(allIds);
  }, [categories]);

  const collapseAll = React.useCallback(() => {
    setExpandedCategories(new Set());
  }, []);

  const categoryTree = React.useMemo<CategoryNode[]>(() => {
    if (!categories.length) {
      return [];
    }

    // Filter by type and active status
    let filtered = categories.filter((cat) => cat.type === selectedType);
    if (!includeInactive) {
      filtered = filtered.filter((cat) => cat.is_active);
    }

    // Build node map
    const nodes = new Map<string, CategoryNode>();
    filtered.forEach((cat) => {
      nodes.set(cat.id, {
        ...cat,
        children: [],
      });
    });

    // Build tree structure
    const roots: CategoryNode[] = [];
    nodes.forEach((node) => {
      if (node.parent_id && nodes.has(node.parent_id)) {
        nodes.get(node.parent_id)?.children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Sort children recursively
    const sortNode = (node: CategoryNode) => {
      node.children.sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
      );
      node.children.forEach(sortNode);
    };

    roots.sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
    );
    roots.forEach(sortNode);

    return roots;
  }, [categories, selectedType, includeInactive]);

  return {
    categoryTree,
    expandedCategories,
    toggleCategory,
    expandAll,
    collapseAll,
  };
}
