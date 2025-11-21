import {
  IconCalendar,
  IconCircle,
  IconCreditCard,
  IconDotsVertical,
  IconRepeat,
} from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import type { TFunction } from "i18next";
import type * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  onMarkAsPaid?: (expense: ExpenseTableRow) => void;
  onMarkAsPending?: (expense: ExpenseTableRow) => void;
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
    onMarkAsPaid,
    onMarkAsPending,
    getCategoryMeta,
    getAccountName,
  } = options;

  const hasActions = Boolean(
    onViewExpense ||
      onEditExpense ||
      onDeleteExpense ||
      onMarkAsPaid ||
      onMarkAsPending,
  );

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
        const expectedDate = tx.date ? new Date(tx.date) : null;
        const paidAtDate = tx.paidAt ? new Date(tx.paidAt) : null;

        let badgeClass = "";
        let badgeIcon: React.ReactNode = null;
        let badgeLabel = "";

        if (!isRecurring && !isInstallment) {
          type PaymentStatus =
            | "pending"
            | "paidOnTime"
            | "paidLate"
            | "paidEarly"
            | "paid";
          type PaymentStatusKey = `table.status.${PaymentStatus}`;

          const normalizeDate = (value: Date) =>
            new Date(
              value.getFullYear(),
              value.getMonth(),
              value.getDate(),
            ).getTime();

          const paymentStatus: PaymentStatus = (() => {
            if (!isPaid) {
              return "pending";
            }
            if (!expectedDate || !paidAtDate) {
              return "paid";
            }

            const expectedTime = normalizeDate(expectedDate);
            const paidTime = normalizeDate(paidAtDate);

            if (paidTime === expectedTime) {
              return "paidOnTime";
            }
            if (paidTime > expectedTime) {
              return "paidLate";
            }
            return "paidEarly";
          })();

          const paymentClassMap: Record<PaymentStatus, string> = {
            pending:
              "border-destructive/40 bg-destructive/10 text-destructive flex items-center gap-1",
            paidOnTime:
              "border-gray-400/40 bg-gray-400/10 text-gray-500 flex items-center gap-1",
            paidLate:
              "border-gray-400/40 bg-gray-400/10 text-gray-500 flex items-center gap-1",
            paidEarly:
              "border-gray-400/40 bg-gray-400/10 text-gray-500 flex items-center gap-1",
            paid: "border-gray-400/40 bg-gray-400/10 text-gray-500 flex items-center gap-1",
          };

          const paymentIconClassMap: Record<PaymentStatus, string> = {
            pending: "fill-destructive text-destructive",
            paidOnTime: "fill-gray-500 text-gray-500",
            paidLate: "fill-gray-500 text-gray-500",
            paidEarly: "fill-gray-500 text-gray-500",
            paid: "fill-destructive text-destructive",
          };

          const statusKey: PaymentStatusKey = `table.status.${paymentStatus}`;

          badgeClass = paymentClassMap[paymentStatus];
          badgeIcon = (
            <IconCircle
              className={cn(
                "size-2 shrink-0",
                paymentIconClassMap[paymentStatus],
              )}
            />
          );
          badgeLabel = t(statusKey);
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
      accessorKey: "paidAt",
      header: t("table.columns.paidAt"),
      cell: ({ row }) => {
        const isPaid = row.original.isPaid;
        const paidAt = row.original.paidAt
          ? new Date(row.original.paidAt)
          : null;

        if (!isPaid) {
          return <Badge variant="muted">{t("table.status.notPaidYet")}</Badge>;
        }

        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-sm font-medium text-muted-foreground">
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

        if (row.original.method === "credit") {
          return (
            <Badge variant="outline">{t("form.paymentMethods.credit")}</Badge>
          );
        }

        if (!account) return t("table.noData");
        return <Badge variant="muted">{account as string}</Badge>;
      },
    },
    {
      accessorKey: "categoryName",
      header: t("table.columns.category"),
      cell: ({ row }) => {
        const category =
          getCategoryMeta?.(row.original) ?? row.original.categoryName;
        if (!category) return t("table.noData");
        return <Badge variant="muted">{category as string}</Badge>;
      },
    },
    {
      accessorKey: "method",
      header: t("table.columns.method"),
      cell: ({ row }) => {
        const key = `form.paymentMethods.${row.original.method}` as const;
        return <Badge variant="muted">{t(key)}</Badge>;
      },
    },
  ];

  if (hasActions) {
    columns.push({
      id: "actions",
      header: t("table.columns.actions"),
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
              size="icon"
            >
              <IconDotsVertical />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              disabled={!onEditExpense}
              onSelect={(event) => {
                event.preventDefault();
                onEditExpense?.(row.original);
              }}
            >
              {t("table.actions.editExpense", {
                defaultValue: "Editar despesa",
              })}
            </DropdownMenuItem>
            {!row.original.isPaid ? (
              <DropdownMenuItem
                disabled={!onMarkAsPaid}
                onSelect={(event) => {
                  event.preventDefault();
                  onMarkAsPaid?.(row.original);
                }}
              >
                {t("table.actions.markAsPaid", {
                  defaultValue: "Marcar como pago",
                })}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                disabled={!onMarkAsPending}
                onSelect={(event) => {
                  event.preventDefault();
                  onMarkAsPending?.(row.original);
                }}
              >
                {t("table.actions.markAsPending", {
                  defaultValue: "Marcar como pendente",
                })}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={!onDeleteExpense}
              onSelect={(event) => {
                event.preventDefault();
                onDeleteExpense?.(row.original);
              }}
            >
              {t("table.actions.deleteExpense", {
                defaultValue: "Deletar",
              })}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    });
  }

  return columns;
}
