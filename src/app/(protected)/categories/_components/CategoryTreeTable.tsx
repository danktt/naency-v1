"use client";

import { GlowCard } from "@/components/gloweffect";
import type { CategoryNode } from "@/hooks/categories/useCategoryTree";
import * as React from "react";
import { CategoryRow } from "./CategoryRow";

type CategoryTreeTableProps = {
  categories: CategoryNode[];
  headers: {
    category: string;
    type: string;
    status: string;
  };
  emptyMessage: string;
  expandedCategories: Set<string>;
  onToggleCategory: (categoryId: string) => void;
  onEdit: (category: CategoryNode) => void;
  onDelete: (category: CategoryNode) => void;
  onRestore: (category: CategoryNode) => void;
  onCreateSubcategory?: (category: CategoryNode) => void;
  processingId: string | null;
};

export function CategoryTreeTable({
  categories,
  headers,
  emptyMessage,
  expandedCategories,
  onToggleCategory,
  onEdit,
  onDelete,
  onRestore,
  onCreateSubcategory,
  processingId,
}: CategoryTreeTableProps) {
  const renderNodes = React.useCallback(
    (nodes: CategoryNode[], depth = 0): React.ReactNode =>
      nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const isExpanded = expandedCategories.has(node.id);
        const isProcessing = processingId === node.id;

        return (
          <React.Fragment key={node.id}>
            <CategoryRow
              category={{
                id: node.id,
                name: node.name,
                type: node.type,
                color: node.color,
                icon: node.icon,
                is_active: node.is_active,
                childrenCount: node.children.length,
              }}
              isChild={depth > 0}
              hasChildren={hasChildren}
              isExpanded={isExpanded}
              onToggle={
                hasChildren ? () => onToggleCategory(node.id) : undefined
              }
              onEdit={() => onEdit(node)}
              onDelete={node.is_active ? () => onDelete(node) : undefined}
              onRestore={!node.is_active ? () => onRestore(node) : undefined}
              isProcessing={isProcessing}
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
      expandedCategories,
      onToggleCategory,
      onEdit,
      onDelete,
      onRestore,
      processingId,
    ],
  );

  return (
    <GlowCard>
      <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <div className="min-w-[300px] flex-1">{headers.category}</div>
        <div className="min-w-[120px]">{headers.type}</div>
        <div className="min-w-[100px]">{headers.status}</div>
        <div className="min-w-[40px]" />
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
    </GlowCard>
  );
}
