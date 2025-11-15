"use client";

import { IconPencil } from "@tabler/icons-react";
import {
  ChevronDown,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface CategoryRowProps {
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
    type: "expense" | "income";
    planned: number;
    spent: number;
  };
  onUpdatePlanned: (value: number) => void;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  isParent?: boolean;
}

export function CategoryRow({
  category,
  onUpdatePlanned,
  hasChildren = false,
  isExpanded = false,
  onToggle,
  isParent = false,
}: CategoryRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(category.planned.toString());

  const difference = category.planned - category.spent;
  const percentage =
    category.planned > 0 ? (category.spent / category.planned) * 100 : 0;
  const isOverBudget = percentage > 100;

  const handleBlur = () => {
    const value = parseFloat(inputValue) || 0;
    onUpdatePlanned(value);
    setIsEditing(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div
      className={`rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/5 ${
        isParent && hasChildren ? "bg-muted/30" : ""
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Category Info */}
        <div className="flex items-center gap-3 md:min-w-[200px]">
          {hasChildren && onToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={onToggle}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}

          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl"
            style={{ backgroundColor: `${category.color}20` }}
          >
            {category.icon}
          </div>
          <div>
            <p
              className={`font-medium text-card-foreground ${isParent && hasChildren ? "text-base font-semibold" : ""}`}
            >
              {category.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {category.type === "expense" ? "Despesa" : "Receita"}
              {isParent && hasChildren && " (Total)"}
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:gap-6">
          {/* Planned Amount */}
          <div className="flex-1">
            <Label className="mb-1 block text-xs font-medium text-muted-foreground">
              Planejado
            </Label>
            {isParent && hasChildren ? (
              <div className="flex h-9 items-center rounded-md border border-border bg-muted/50 px-3">
                <span className="text-sm font-semibold text-foreground">
                  {formatCurrency(category.planned)}
                </span>
              </div>
            ) : isEditing ? (
              <Input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => e.key === "Enter" && handleBlur()}
                className="h-9"
                autoFocus
              />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                icon={<IconPencil stroke={1.5} />}
              >
                {formatCurrency(category.planned)}
              </Button>
            )}
          </div>

          {/* Spent Amount */}
          <div className="flex-1">
            <Label className="mb-1 block text-xs font-medium text-muted-foreground">
              Realizado
            </Label>
            <div className="flex h-9 items-center rounded-md border border-border bg-muted px-3">
              <span className="text-sm font-semibold text-foreground">
                {formatCurrency(category.spent)}
              </span>
            </div>
          </div>

          {/* Difference */}
          <div className="flex-1">
            <Label className="mb-1 block text-xs font-medium text-muted-foreground">
              Diferença
            </Label>
            <div
              className={`flex h-9 items-center gap-2 rounded-md px-3 ${
                isOverBudget
                  ? "bg-destructive/10 text-destructive"
                  : "bg-accent/10 text-accent-foreground"
              }`}
            >
              {isOverBudget ? (
                <TrendingDown className="h-4 w-4" />
              ) : (
                <TrendingUp className="h-4 w-4" />
              )}
              <span className="text-sm font-semibold">
                {formatCurrency(Math.abs(difference))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progresso</span>
          <span
            className={`font-medium ${
              isOverBudget ? "text-destructive" : "text-accent-foreground"
            }`}
          >
            {percentage.toFixed(0)}%
          </span>
        </div>
        <Progress
          value={Math.min(percentage, 100)}
          className="h-2"
          color={isOverBudget ? "destructive" : "accent"}
        />
      </div>
    </div>
  );
}
