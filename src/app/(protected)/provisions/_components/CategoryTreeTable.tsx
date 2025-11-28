"use client";

import * as React from "react";

import { CategoryRow } from "./CategoryRow";
import type { TreeNode } from "./types";

type CategoryTreeTableProps = {
  categories: TreeNode[];
  headers: {
    category: string;
    planned: string;
    realized: string;
    progress: string;
    difference: string;
  };
  emptyMessage: string;
  expandedCategories: Set<string>;
  onToggleCategory: (categoryId: string) => void;
  editingId: string | null;
  onRequestEdit: (categoryId: string) => void;
  onCancelEdit: () => void;
  onCommitEdit: (categoryId: string, value: number) => void;
  updatingCategoryId: string | null;
};

export function CategoryTreeTable({
  categories,
  headers,
  emptyMessage,
  expandedCategories,
  onToggleCategory,
  editingId,
  onRequestEdit,
  onCancelEdit,
  onCommitEdit,
  updatingCategoryId,
}: CategoryTreeTableProps) {
  const renderNodes = React.useCallback(
    (nodes: TreeNode[], depth = 0): React.ReactNode =>
      nodes.map((node) => {
        const categoryKey = node.categoryId ?? node.id;
        const hasChildren = node.children.length > 0;
        const isExpanded = expandedCategories.has(categoryKey);
        const isEditing = editingId === categoryKey;

        const handleCommit = (value: number) => {
          if (!node.categoryId) return;
          onCommitEdit(node.categoryId, value);
        };

        return (
          <React.Fragment key={categoryKey}>
            <CategoryRow
              category={{
                id: categoryKey,
                name: node.name,
                icon: node.name.charAt(0).toUpperCase(),
                planned: node.planned,
                spent: node.realized,
                childrenCount: node.children.length,
              }}
              isChild={depth > 0}
              hasChildren={hasChildren}
              isExpanded={isExpanded}
              onToggle={
                hasChildren ? () => onToggleCategory(categoryKey) : undefined
              }
              isEditing={isEditing}
              onRequestEdit={
                !hasChildren ? () => onRequestEdit(categoryKey) : undefined
              }
              onCancelEdit={onCancelEdit}
              onCommitEdit={handleCommit}
              isUpdating={updatingCategoryId === node.categoryId}
            />
            {hasChildren && isExpanded && (
              <div className="border-border/60 ml-6 space-y-2 border-l-2 pl-4">
                {renderNodes(node.children, depth + 1)}
              </div>
            )}
          </React.Fragment>
        );
      }),
    [
      editingId,
      expandedCategories,
      onToggleCategory,
      onRequestEdit,
      onCancelEdit,
      onCommitEdit,
      updatingCategoryId,
    ],
  );

  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <div className="min-w-[240px]">{headers.category}</div>
        <div className="min-w-[160px]">{headers.planned}</div>
        <div className="min-w-[160px]">{headers.realized}</div>
        <div className="flex-1">{headers.progress}</div>
        <div className="min-w-[140px] text-right">{headers.difference}</div>
      </div>
      <div>
        {categories.length > 0 ? (
          renderNodes(categories)
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}

