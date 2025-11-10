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
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/helpers/formatCurrency";
import { formatDate } from "@/helpers/formatDate";
import { cn } from "@/lib/utils";
import type { AppRouter } from "@/server/api/root";

type RouterOutput = inferRouterOutputs<AppRouter>;
export type ExpenseTableRow = RouterOutput["transactions"]["list"][number];

type CategoryMeta = { name: string; color?: string | null };

type ExpenseColumnsOptions = {
  onViewExpense?: (expense: ExpenseTableRow) => void;
  onEditExpense?: (expense: ExpenseTableRow) => void;
  onDeleteExpense?: (expense: ExpenseTableRow) => void;
  getCategoryMeta?: (expense: ExpenseTableRow) => CategoryMeta | null;
  getAccountName?: (expense: ExpenseTableRow) => string | null;
};

type CreateExpenseColumnsParams = ExpenseColumnsOptions & {
  t: TFunction<"expenses">;
};

export function createExpenseColumns({
  t,
  ...options
}: CreateExpenseColumnsParams): ColumnDef<ExpenseTableRow>[] {
  const {
    onViewExpense,
    onEditExpense,
    onDeleteExpense,
    getCategoryMeta,
    getAccountName,
  } = options;

  const hasActions = Boolean(onViewExpense || onEditExpense || onDeleteExpense);

  const columns: ColumnDef<ExpenseTableRow>[] = [
    {
      accessorKey: "dateAndStatus",
      header: t("table.columns.date"),
      cell: ({ row }) => {
        const tx = row.original;

        const isRecurring = Boolean(tx.recurringId);
        const isInstallment = Boolean(tx.installmentGroupId);

        if (!isRecurring && !isInstallment) {
          return (
            <div className="flex flex-col text-muted-foreground">
              <div className="flex items-center gap-2">
                <IconCalendar className="size-4 text-destructive" />
                <span>{formatDate(tx.date)}</span>
              </div>
            </div>
          );
        }

        if (isInstallment) {
          return (
            <div className="flex flex-col text-muted-foreground">
              <div className="flex items-center gap-2">
                <IconCreditCard className="size-4 text-amber-500" />
                <span>{formatDate(tx.date)}</span>
              </div>
            </div>
          );
        }

        if (isRecurring) {
          return (
            <div className="flex flex-col text-muted-foreground">
              <div className="flex items-center gap-2">
                <IconRepeat className="size-4 text-blue-500" />
                <span>{formatDate(tx.date)}</span>
              </div>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconCalendar className="size-4" />
            <span>{t("table.noDate")}</span>
          </div>
        );
      },
    },
    {
      id: "status",
      header: t("table.columns.status"),
      cell: ({ row }) => {
        const tx = row.original;

        const isRecurring = Boolean(tx.recurringId);
        const isInstallment = Boolean(tx.installmentGroupId);
        const isPaid = Boolean(tx.isPaid);

        let badgeClass = "";
        let badgeIcon: React.ReactNode = null;
        let badgeLabel = "";

        if (!isRecurring && !isInstallment) {
          badgeClass = isPaid
            ? "border-destructive/40 bg-destructive/10 text-destructive flex items-center gap-1"
            : "border-amber-400/40 bg-amber-400/10 text-amber-500 flex items-center gap-1";
          badgeIcon = (
            <IconCircle
              className={cn(
                "size-2 shrink-0",
                isPaid
                  ? "fill-destructive text-destructive"
                  : "fill-amber-500 text-amber-500",
              )}
            />
          );
          badgeLabel = isPaid
            ? t("table.status.paid")
            : t("table.status.pending");
        } else if (isInstallment) {
          badgeClass =
            "border-amber-400/40 bg-amber-400/10 text-amber-500 flex items-center gap-1";
          badgeIcon = (
            <IconCreditCard className="size-3 text-amber-500 shrink-0" />
          );
          badgeLabel = t("table.type.installment", {
            current: tx.installmentNumber,
            total: tx.totalInstallments,
          });
        } else if (isRecurring) {
          badgeClass =
            "border-blue-400/40 bg-blue-400/10 text-blue-500 flex items-center gap-1";
          badgeIcon = <IconRepeat className="size-3 text-blue-500 shrink-0" />;
          badgeLabel = t("table.type.recurring");
        }

        return (
          <div className="flex flex-col gap-1">
            <Badge variant="secondary" className={badgeClass}>
              {badgeIcon}
              {badgeLabel}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "amount",
      header: t("table.columns.amount"),
      cell: ({ row }) => {
        const amount = Number(row.getValue("amount"));
        return (
          <div className="font-mono font-semibold text-destructive">
            {formatCurrency(amount.toString())}
          </div>
        );
      },
    },
    {
      accessorKey: "isPaid",
      header: t("table.columns.isPaid"),
      cell: ({ row }) => {
        const isPaid = row.original.isPaid;

        if (isPaid) {
          return (
            <Badge
              variant="secondary"
              className="bg-rose-100 text-rose-700 border-rose-200"
            >
              {t("table.status.paid")}
            </Badge>
          );
        }

        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            {t("table.status.pending")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "paidAt",
      header: t("table.columns.paidAt"),
      cell: ({ row }) => {
        const isPaid = row.original.isPaid;
        const paidAt = row.original.paidAt
          ? new Date(row.original.paidAt)
          : null;

        if (!isPaid) {
          return (
            <span className="text-xs text-muted-foreground">
              {t("table.status.notPaidYet")}
            </span>
          );
        }

        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <i className="fa-regular fa-calendar-check text-destructive" />
            <span className="text-sm font-medium text-destructive">
              {paidAt ? formatDate(paidAt) : "-"}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "description",
      header: t("table.columns.description"),
      cell: ({ row }) => (
        <p
          className="max-w-[200px] truncate capitalize"
          title={row.getValue("description")}
        >
          {String(row.getValue("description")).toUpperCase()}
        </p>
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
          {onViewExpense && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewExpense(row.original)}
              title={t("table.actions.view")}
            >
              <IconEye className="size-4" />
            </Button>
          )}
          {onEditExpense && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditExpense(row.original)}
              title={t("table.actions.edit")}
            >
              <IconEdit className="size-4" />
            </Button>
          )}
          {onDeleteExpense && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteExpense(row.original)}
              title={t("table.actions.delete")}
              className="text-destructive hover:text-destructive"
            >
              <IconTrash className="size-4" />
            </Button>
          )}
        </div>
      ),
    });
  }

  return columns;
}

