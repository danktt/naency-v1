"use client";

import {
  IconCalendar,
  IconCircle,
  IconCreditCard,
  IconEdit,
  IconEye,
  IconRepeat,
  IconTrash,
} from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import type { TFunction } from "i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/helpers/formatCurrency";
import { formatDate } from "@/helpers/formatDate";
import type { AppRouter } from "@/server/api/root";

type RouterOutput = inferRouterOutputs<AppRouter>;
export type IncomeTableRow = RouterOutput["transactions"]["list"][number];

type CategoryMeta = { name: string; color?: string | null };

type IncomeColumnsOptions = {
  onViewIncome?: (income: IncomeTableRow) => void;
  onEditIncome?: (income: IncomeTableRow) => void;
  onDeleteIncome?: (income: IncomeTableRow) => void;
  getCategoryMeta?: (income: IncomeTableRow) => CategoryMeta | null;
  getAccountName?: (income: IncomeTableRow) => string | null;
};

type CreateIncomeColumnsParams = IncomeColumnsOptions & {
  t: TFunction<"incomes">;
};

export function createIncomeColumns({
  t,
  ...options
}: CreateIncomeColumnsParams): ColumnDef<IncomeTableRow>[] {
  const {
    onViewIncome,
    onEditIncome,
    onDeleteIncome,
    getCategoryMeta,
    getAccountName,
  } = options;

  const hasActions = Boolean(onViewIncome || onEditIncome || onDeleteIncome);

  const columns: ColumnDef<IncomeTableRow>[] = [
    {
      accessorKey: "date",
      header: t("table.columns.date"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <IconCalendar className="size-4" />
          {formatDate(row.original.date)}
        </div>
      ),
    },
    {
      accessorKey: "amount",
      header: t("table.columns.amount"),
      cell: ({ row }) => {
        const amount = row.getValue("amount") as number;
        return (
          <div className="font-mono font-semibold text-success">
            {formatCurrency(amount.toString())}
          </div>
        );
      },
    },
    {
      accessorKey: "description",
      header: t("table.columns.description"),
      cell: ({ row }) => (
        <div
          className="max-w-[200px] truncate capitalize"
          title={row.getValue("description")}
        >
          {String(row.getValue("description")).toUpperCase()}
        </div>
      ),
    },
    {
      accessorKey: "accountName",
      header: t("table.columns.account"),
      cell: ({ row }) => {
        const account =
          getAccountName?.(row.original) ?? row.original.accountName;
        if (!account) return t("table.noData");
        return <Badge variant="secondary">{account as string}</Badge>;
      },
    },
    {
      id: "mode",
      header: t("table.columns.type"),
      cell: ({ row }) => {
        const transaction = row.original;

        let icon = <IconCircle className="size-3" />;
        let label = t("table.type.unique");

        if (transaction.recurringId) {
          icon = <IconRepeat className="size-3" />;
          label = t("table.type.recurring");
        } else if (transaction.installmentGroupId) {
          icon = <IconCreditCard className="size-3" />;
          label = t("table.type.installment", {
            current: transaction.installmentNumber,
            total: transaction.totalInstallments,
          });
        }

        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            {icon}
            {label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "categoryName",
      header: t("table.columns.category"),
      cell: ({ row }) => {
        const category =
          getCategoryMeta?.(row.original) ?? row.original.categoryName;
        if (!category) return t("table.noData");
        return <Badge variant="secondary">{category as string}</Badge>;
      },
    },

    {
      accessorKey: "method",
      header: t("table.columns.method"),
      cell: ({ row }) => {
        const key = `form.paymentMethods.${row.original.method}` as const;
        return <Badge variant="secondary">{t(key)}</Badge>;
      },
    },
  ];

  if (hasActions) {
    columns.push({
      id: "actions",
      header: t("table.columns.actions"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {onViewIncome ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewIncome(row.original)}
              title={t("table.actions.view")}
            >
              <IconEye className="size-4" />
            </Button>
          ) : null}
          {onEditIncome ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditIncome(row.original)}
              title={t("table.actions.edit")}
            >
              <IconEdit className="size-4" />
            </Button>
          ) : null}
          {onDeleteIncome ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteIncome(row.original)}
              title={t("table.actions.delete")}
              className="text-destructive hover:text-destructive"
            >
              <IconTrash className="size-4" />
            </Button>
          ) : null}
        </div>
      ),
    });
  }

  return columns;
}
