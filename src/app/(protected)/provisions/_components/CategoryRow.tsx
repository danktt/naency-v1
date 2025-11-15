"use client";

import { IconPencil } from "@tabler/icons-react";
import {
  ChevronDown,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { FieldCurrencyAmount } from "@/components/FieldCurrencyAmount";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

type CategoryFormValues = {
  plannedAmount: number;
  currency: "BRL" | "USD";
};

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
  onUpdatePlanned: (value: number) => Promise<void> | void;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  isParent?: boolean;
  isUpdating?: boolean;
}

export function CategoryRow({
  category,
  onUpdatePlanned,
  hasChildren = false,
  isExpanded = false,
  onToggle,
  isParent = false,
  isUpdating = false,
}: CategoryRowProps) {
  const { t } = useTranslation("provisions");
  const [isEditing, setIsEditing] = useState(false);
  const form = useForm<CategoryFormValues>({
    defaultValues: {
      plannedAmount: Math.round(category.planned * 100),
      currency: "BRL",
    },
  });

  useEffect(() => {
    if (isEditing) return;
    form.reset({
      plannedAmount: Math.round(category.planned * 100),
      currency: form.getValues("currency") ?? "BRL",
    });
  }, [category.planned, form, isEditing]);

  const difference = category.planned - category.spent;
  const percentage =
    category.planned > 0 ? (category.spent / category.planned) * 100 : 0;
  const isOverBudget = percentage > 100;

  const canEdit = !isParent;

  const handleCancelEdit = () => {
    form.reset({
      plannedAmount: Math.round(category.planned * 100),
      currency: form.getValues("currency") ?? "BRL",
    });
    setIsEditing(false);
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await Promise.resolve(onUpdatePlanned(values.plannedAmount / 100));
      setIsEditing(false);
    } catch {
      // keep editing state so user can retry
    }
  });

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
              <Form {...form}>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <FieldCurrencyAmount<CategoryFormValues>
                    control={form.control}
                    amountName="plannedAmount"
                    currencyName="currency"
                    label={t("categories.plannedLabel")}
                    disabled={isUpdating}
                    required
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={isUpdating}
                    >
                      {t("rowActions.cancel")}
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isUpdating || !form.formState.isDirty}
                    >
                      {isUpdating
                        ? t("rowActions.saving")
                        : t("rowActions.save")}
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex h-9 items-center rounded-md border border-border bg-muted/50 px-3">
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(category.planned)}
                  </span>
                </div>
                {canEdit ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    disabled={isUpdating}
                  >
                    <IconPencil stroke={1.5} className="me-1" />
                    {t("rowActions.edit")}
                  </Button>
                ) : null}
              </div>
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
                  ? "bg-destructive/20 text-destructive"
                  : "bg-success/20 text-accent-foreground"
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
          indicatorClassName={isOverBudget ? "bg-destructive" : "bg-success"}
        />
      </div>
    </div>
  );
}
