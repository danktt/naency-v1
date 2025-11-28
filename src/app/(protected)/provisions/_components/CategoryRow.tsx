"use client";

import { ChevronDown, ChevronRightIcon } from "lucide-react";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/helpers/formatCurrency";
import { cn } from "@/lib/utils";

type CategoryRowProps = {
  category: {
    id: string;
    name: string;
    icon?: string | null;
    planned: number;
    spent: number;
    childrenCount?: number;
  };
  isChild?: boolean;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  isEditing?: boolean;
  onRequestEdit?: () => void;
  onCommitEdit?: (value: number) => void;
  onCancelEdit?: () => void;
  isUpdating?: boolean;
};

export function CategoryRow({
  category,
  isChild = false,
  hasChildren = false,
  isExpanded = false,
  onToggle,
  isEditing = false,
  onRequestEdit,
  onCommitEdit,
  onCancelEdit,
  isUpdating = false,
}: CategoryRowProps) {
  const iconLabel = category.icon ?? category.name.charAt(0).toUpperCase();
  const plannedValue = category.planned ?? 0;
  const spentValue = category.spent ?? 0;
  const difference = plannedValue - spentValue;
  const progressPercent =
    plannedValue > 0 ? (spentValue / plannedValue) * 100 : 0;
  const isOverBudget = spentValue > plannedValue;
  const [inputValue, setInputValue] = React.useState(String(plannedValue ?? 0));

  React.useEffect(() => {
    if (isEditing) {
      setInputValue(String(plannedValue ?? 0));
    }
  }, [isEditing, plannedValue]);

  const commitValue = React.useCallback(() => {
    if (!onCommitEdit) return;
    const parsed = Number(inputValue);
    if (Number.isNaN(parsed)) {
      onCancelEdit?.();
      return;
    }
    onCommitEdit(parsed);
  }, [inputValue, onCommitEdit, onCancelEdit]);

  return (
    <div
      className={cn(
        "group flex items-center gap-4 border-b border-border py-4 pr-4 transition-colors hover:bg-muted/30",
        isChild ? "pl-12" : "pl-4",
      )}
    >
      <div className="flex min-w-[240px] items-center gap-3">
        {hasChildren && !isChild ? (
          <button
            type="button"
            onClick={onToggle}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-6" />
        )}
        <span className="text-2xl">{iconLabel}</span>
        <div>
          <p className="font-medium text-foreground">{category.name}</p>
          {hasChildren && (
            <p className="text-xs text-muted-foreground">
              {category.childrenCount ?? 0} subcategorias
            </p>
          )}
        </div>
      </div>

      <div className="flex min-w-[160px] items-center">
        {isEditing && !hasChildren ? (
          <Input
            type="number"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            autoFocus
            onBlur={commitValue}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitValue();
              }
              if (event.key === "Escape") {
                onCancelEdit?.();
              }
            }}
            className="h-8 w-32"
            disabled={isUpdating}
          />
        ) : (
          <button
            type="button"
            onClick={() => !hasChildren && onRequestEdit?.()}
            disabled={hasChildren || isUpdating}
            className={cn(
              "rounded px-2 py-1 text-sm font-semibold transition-colors",
              hasChildren
                ? "cursor-default text-muted-foreground"
                : "text-foreground hover:bg-muted",
            )}
          >
            {formatCurrency(plannedValue)}
          </button>
        )}
      </div>

      <div className="min-w-[160px]">
        <p
          className={cn(
            "text-sm font-semibold",
            isOverBudget ? "text-destructive" : "text-foreground",
          )}
        >
          {formatCurrency(spentValue)}
        </p>
      </div>

      <div className="flex flex-1 items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full transition-all",
              isOverBudget ? "bg-destructive" : "bg-success",
            )}
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
        <p
          className={cn(
            "min-w-[60px] text-right text-sm font-semibold",
            isOverBudget ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {progressPercent.toFixed(0)}%
        </p>
      </div>

      <div className="min-w-[140px] text-right">
        <p
          className={cn(
            "text-sm font-semibold",
            isOverBudget ? "text-destructive" : "text-success",
          )}
        >
          {isOverBudget ? "-" : "+"}
          {formatCurrency(Math.abs(difference))}
        </p>
      </div>
    </div>
  );
}
