"use client";

import {
  ChevronDown,
  ChevronRightIcon,
  Edit,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type CategoryRowProps = {
  category: {
    id: string;
    name: string;
    type: "expense" | "income";
    color: string | null;
    icon: string | null;
    is_active: boolean;
    childrenCount?: number;
  };
  isChild?: boolean;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  isProcessing?: boolean;
};

export function CategoryRow({
  category,
  isChild = false,
  hasChildren = false,
  isExpanded = false,
  onToggle,
  onEdit,
  onDelete,
  onRestore,
  isProcessing = false,
}: CategoryRowProps) {
  const { t } = useTranslation("categories");

  return (
    <div
      className={cn(
        "group flex items-center gap-4 border-b border-border py-4 pr-4 transition-colors hover:bg-muted/30",
        isChild ? "pl-12" : "pl-4",
        !category.is_active && "opacity-50",
      )}
    >
      <div className="flex min-w-[300px] items-center gap-3 flex-1">
        {hasChildren ? (
          <button
            type="button"
            onClick={onToggle}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
            disabled={isProcessing}
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
        {/* <span className="text-2xl" style={colorStyle}>
          {iconLabel}
        </span> */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            {category.name}
          </p>
          {hasChildren && (
            <p className="text-xs text-muted-foreground">
              {category.childrenCount ?? 0}{" "}
              {category.childrenCount === 1
                ? t("table.subcategory")
                : t("table.subcategories")}
            </p>
          )}
        </div>
      </div>

      <div className="min-w-[120px]">
        <Badge
          variant={category.type === "expense" ? "destructive" : "default"}
          className="capitalize"
        >
          {t(`tabs.${category.type === "expense" ? "expenses" : "incomes"}`)}
        </Badge>
      </div>

      <div className="min-w-[100px]">
        <Badge
          variant={category.is_active ? "default" : "secondary"}
          className="capitalize"
        >
          {category.is_active ? t("status.active") : t("status.inactive")}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
              disabled={isProcessing}
            >
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              <span className="sr-only">{t("actions.moreActions")}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={onEdit} disabled={isProcessing}>
                <Edit className="h-4 w-4" />
                <span>{t("actions.edit")}</span>
              </DropdownMenuItem>
            )}
            {(onDelete || onRestore) && (
              <>
                {onEdit && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  onClick={category.is_active ? onDelete : onRestore}
                  disabled={isProcessing}
                  variant={category.is_active ? "destructive" : "default"}
                >
                  <Trash2 className="h-4 w-4" />
                  <span>
                    {category.is_active
                      ? t("actions.delete")
                      : t("actions.restore")}
                  </span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
