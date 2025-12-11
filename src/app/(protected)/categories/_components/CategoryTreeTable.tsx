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
  onDuplicate?: (category: CategoryNode) => void;
  onMove?: (category: CategoryNode) => void;
  processingId: string | null;
  highlightedCategoryId?: string | null;
};

export function CategoryTreeTable({
  categories,
  headers: _headers,
  emptyMessage,
  expandedCategories,
  onToggleCategory,
  onEdit,
  onDelete,
  onRestore,
  onCreateSubcategory,
  onDuplicate,
  onMove,
  processingId,
  highlightedCategoryId,
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
              subcategories={
                hasChildren
                  ? node.children.map((child) => ({
                      id: child.id,
                      name: child.name,
                    }))
                  : []
              }
              isChild={depth > 0}
              hasChildren={hasChildren}
              isExpanded={isExpanded}
              hasTransactions={false}
              isHighlighted={highlightedCategoryId === node.id}
              onToggle={
                hasChildren ? () => onToggleCategory(node.id) : undefined
              }
              onEdit={() => onEdit(node)}
              onDelete={node.is_active ? () => onDelete(node) : undefined}
              onRestore={!node.is_active ? () => onRestore(node) : undefined}
              onCreateSubcategory={
                onCreateSubcategory
                  ? () => onCreateSubcategory(node)
                  : undefined
              }
              onDuplicate={onDuplicate ? () => onDuplicate(node) : undefined}
              onMove={onMove ? () => onMove(node) : undefined}
              isProcessing={isProcessing}
            />
            {hasChildren && isExpanded && (
              <div className="border-border/60 ml-4 space-y-2 border-l-2 pl-2">
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
      onCreateSubcategory,
      onDuplicate,
      onMove,
      processingId,
      highlightedCategoryId,
    ],
  );

  return (
    <GlowCard contentClassName="p-0">
      <div className="grid grid-cols-[1fr_120px_100px_50px] gap-4 rounded-t-lg px-4 py-3 border-b border-foreground/10 bg-accent">
        <span className="text-xs font-medium text-muted-foreground  tracking-wider">
          Categoria
        </span>
        <span className="text-xs hidden md:block font-medium text-muted-foreground  tracking-wider">
          Status
        </span>
        <span className="text-xs text-end md:text-center md:col-span-1 col-span-3  font-medium text-muted-foreground  tracking-wider">
          Ações
        </span>
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
