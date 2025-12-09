"use client";

import { DynamicIcon } from "@/components/DynamicIcon";
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
import { IconChecks } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import type * as React from "react";

type RouterOutput = inferRouterOutputs<AppRouter>;
export type IncomeTableRow = RouterOutput["transactions"]["list"][number];

type CategoryMeta = { name: string; color?: string | null };

type IncomeColumnsOptions = {
  onViewIncome?: (income: IncomeTableRow) => void;
  onEditIncome?: (income: IncomeTableRow) => void;
  onDeleteIncome?: (income: IncomeTableRow) => void;
  onMarkAsPaid?: (income: IncomeTableRow) => void;
  onMarkAsPending?: (income: IncomeTableRow) => void;
  getCategoryMeta?: (income: IncomeTableRow) => CategoryMeta | null;
  getAccountName?: (income: IncomeTableRow) => string | null;
};

type CreateIncomeColumnsParams = IncomeColumnsOptions;

const PAYMENT_METHODS: Record<string, string> = {
  pix: "Pix",
  transfer: "Transferência",
  debit: "Débito",
  credit: "Crédito",
  cash: "Dinheiro",
  boleto: "Boleto",
  investment: "Investimento",
};

// Helper function to get date value for filtering
function getDateValue(tx: IncomeTableRow): string {
  if (!tx.date) return "";
  return formatDate(new Date(tx.date));
}

export function createIncomeColumns(
  options: CreateIncomeColumnsParams,
): ColumnDef<IncomeTableRow>[] {
  const {
    onViewIncome,
    onEditIncome,
    onDeleteIncome,
    onMarkAsPaid,
    onMarkAsPending,
    getCategoryMeta,
    getAccountName,
  } = options;

  const hasActions = Boolean(
    onViewIncome ||
      onEditIncome ||
      onDeleteIncome ||
      onMarkAsPaid ||
      onMarkAsPending,
  );

  const columns: ColumnDef<IncomeTableRow>[] = [
    {
      id: "date",
      header: "Data",
      accessorFn: (row) => getDateValue(row),
      cell: ({ row }) => {
        const tx = row.original;
        const isPaid = Boolean(tx.isPaid);

        const normalizeDate = (value: Date) =>
          new Date(
            value.getFullYear(),
            value.getMonth(),
            value.getDate(),
          ).getTime();

        const today = normalizeDate(new Date());
        const date = tx.date ? normalizeDate(new Date(tx.date)) : null;
        const isLate = !isPaid && date !== null && date < today;

        if (!tx.date) {
          return (
            <div className="flex items-center gap-2 text-muted-foreground">
              <DynamicIcon icon="calendar" className="size-4" />
              <span>Sem data</span>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2">
            {isLate ? (
              <DynamicIcon
                icon="warning"
                className="size-4 shrink-0 text-text-negative animate-pulse"
              />
            ) : (
              <DynamicIcon
                icon={isPaid ? "calendar-check" : "calendar-time"}
                className={cn(
                  "size-4 shrink-0",
                  isPaid ? "text-gray-500" : "text-muted-foreground",
                )}
              />
            )}
            <span
              className={cn(
                isPaid ? "text-gray-500" : isLate && "text-text-negative",
              )}
            >
              {formatDate(tx.date)}
            </span>
          </div>
        );
      },
    },
    {
      id: "type",
      header: "Tipo",
      cell: ({ row }) => {
        const tx = row.original;
        const isRecurring = Boolean(tx.recurringId);
        const isInstallment = Boolean(tx.installmentGroupId);
        const isUnique = !isRecurring && !isInstallment;
        const isPaid = Boolean(tx.isPaid);

        let typeLabel = "";
        let typeIcon: React.ReactNode = null;
        let typeClass = "";

        if (isPaid) {
          if (isUnique) {
            typeLabel = "À vista";
            typeIcon = (
              <DynamicIcon
                icon="unique"
                className="size-3 shrink-0 text-gray-500"
              />
            );
            typeClass =
              "border-gray-500/40 bg-gray-500/10 text-gray-500 flex items-center gap-1";
          } else if (isInstallment) {
            const installmentNumber = tx.installmentNumber ?? 1;
            const totalInstallments = tx.totalInstallments ?? 1;
            typeLabel = `Parcelada (${installmentNumber}/${totalInstallments})`;
            typeIcon = (
              <DynamicIcon
                icon="installment"
                className="size-3 shrink-0 text-gray-500"
              />
            );
            typeClass =
              "border-gray-500/40 bg-gray-500/10 text-gray-500 flex items-center gap-1";
          } else if (isRecurring) {
            typeLabel = "Recorrente";
            typeIcon = (
              <DynamicIcon
                icon="recurring"
                className="size-3 shrink-0 text-gray-500"
              />
            );
            typeClass =
              "border-gray-500/40 bg-gray-500/10 text-gray-500 flex items-center gap-1";
          }
        } else {
          if (isUnique) {
            typeLabel = "À vista";
            typeIcon = (
              <DynamicIcon icon="unique" className="size-3 shrink-0 " />
            );
            typeClass =
              "border-text-positive dark:bg-text-positive/10 bg-text-positive/20 text-text-positive  flex items-center gap-1";
          } else if (isInstallment) {
            const installmentNumber = tx.installmentNumber ?? 1;
            const totalInstallments = tx.totalInstallments ?? 1;
            typeLabel = `Parcelada (${installmentNumber}/${totalInstallments})`;
            typeIcon = (
              <DynamicIcon icon="installment" className="size-3 shrink-0" />
            );
            typeClass =
              " border-text-installment dark:bg-text-installment/10 bg-text-installment/20 text-text-installment  flex items-center gap-1";
          } else if (isRecurring) {
            typeLabel = "Recorrente";
            typeIcon = (
              <DynamicIcon icon="recurring" className="size-3 shrink-0" />
            );
            typeClass =
              "border-text-recurring dark:bg-text-recurring/10 bg-text-recurring/20 text-text-recurring  flex items-center gap-1";
          }
        }

        return (
          <Badge variant="outline" className={typeClass}>
            {typeIcon}
            {typeLabel}
          </Badge>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      accessorFn: (row) => {
        const isPaid = Boolean(row.isPaid);
        if (isPaid) return "Recebido";

        const normalizeDate = (value: Date) =>
          new Date(
            value.getFullYear(),
            value.getMonth(),
            value.getDate(),
          ).getTime();

        const today = normalizeDate(new Date());
        const date = row.date ? normalizeDate(new Date(row.date)) : null;
        const isPastDue = date !== null && date < today;

        return isPastDue ? "Em atraso" : "Em aberto";
      },
      cell: ({ row }) => {
        const tx = row.original;
        const isPaid = Boolean(tx.isPaid);

        let badgeClass = "";
        let badgeIcon: React.ReactNode = null;
        let badgeLabel = "";

        const normalizeDate = (value: Date) =>
          new Date(
            value.getFullYear(),
            value.getMonth(),
            value.getDate(),
          ).getTime();

        const today = normalizeDate(new Date());
        const date = tx.date ? normalizeDate(new Date(tx.date)) : null;
        const isPastDue = !isPaid && date !== null && date < today;

        if (isPaid) {
          badgeClass =
            "border-gray-400/40 bg-gray-400/10 text-gray-500 flex items-center gap-1";
          badgeIcon = (
            <DynamicIcon
              icon="double-check"
              className="size-3 shrink-0 fill-gray-500 text-gray-500"
            />
          );
          badgeLabel = "Recebido";
        } else if (isPastDue) {
          badgeClass = " text-white bg-text-negative flex items-center gap-1";

          badgeLabel = "Em atraso";
        } else {
          badgeClass =
            "border-text-negative/40 bg-text-negative/10 text-text-negative flex items-center gap-1";

          badgeLabel = "Em aberto";
        }

        return (
          <Badge variant="secondary" className={badgeClass}>
            {badgeIcon}
            {badgeLabel}
          </Badge>
        );
      },
    },
    {
      accessorKey: "amount",
      header: "Valor",
      cell: ({ row }) => {
        const amount = Number(row.getValue("amount"));
        const isPaid = row.original.isPaid;
        const tx = row.original;

        const normalizeDate = (value: Date) =>
          new Date(
            value.getFullYear(),
            value.getMonth(),
            value.getDate(),
          ).getTime();

        const today = normalizeDate(new Date());
        const date = tx.date ? normalizeDate(new Date(tx.date)) : null;
        const isLate = !isPaid && date !== null && date < today;

        return (
          <div
            className={cn(
              "font-mono font-semibold",
              isPaid
                ? "text-gray-500"
                : isLate
                  ? "text-text-negative"
                  : "text-foreground",
            )}
          >
            {formatCurrency(amount.toString())}
          </div>
        );
      },
    },
    {
      accessorKey: "description",
      header: "Descrição",
      cell: ({ row }) => (
        <p
          className={cn(
            "max-w-[200px] truncate capitalize",
            row.original.isPaid && "text-gray-500",
          )}
          title={row.getValue("description")}
        >
          {String(row.getValue("description")).toUpperCase()}
        </p>
      ),
    },
    {
      accessorKey: "accountName",
      header: "Conta",
      cell: ({ row }) => {
        const account =
          getAccountName?.(row.original) ?? row.original.accountName;

        if (row.original.method === "credit") {
          return <Badge variant="outline">{PAYMENT_METHODS.credit}</Badge>;
        }

        if (!account) return "-";
        return <Badge variant="muted">{account as string}</Badge>;
      },
    },
    {
      accessorKey: "categoryName",
      header: "Categoria",
      cell: ({ row }) => {
        const category =
          getCategoryMeta?.(row.original) ?? row.original.categoryName;
        if (!category) return "-";
        return <Badge variant="muted">{category as string}</Badge>;
      },
    },
    {
      accessorKey: "method",
      header: "Forma de pagamento",
      cell: ({ row }) => {
        const method = row.original.method;
        const label = method ? PAYMENT_METHODS[method] : "-";
        return <Badge variant="muted">{label}</Badge>;
      },
    },
  ];

  // Add "Recebido em" column before actions
  columns.push({
    accessorKey: "paidAt",
    header: "Recebido em",
    cell: ({ row }) => {
      const isPaid = row.original.isPaid;
      const paidAt = row.original.paidAt ? new Date(row.original.paidAt) : null;

      if (!isPaid) {
        return null;
      }

      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-sm font-medium text-muted-foreground">
            {paidAt ? formatDate(paidAt) : "-"}
          </span>
        </div>
      );
    },
  });

  if (hasActions) {
    columns.push({
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
              size="icon"
            >
              <DynamicIcon icon="dotsVertical" className="size-4" />
              <span className="sr-only">Abrir menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled={!onEditIncome}
              onSelect={(event) => {
                event.preventDefault();
                onEditIncome?.(row.original);
              }}
            >
              <DynamicIcon icon="edit" className="size-4" />
              Editar receita
            </DropdownMenuItem>
            {!row.original.isPaid ? (
              <DropdownMenuItem
                disabled={!onMarkAsPaid}
                onSelect={(event) => {
                  event.preventDefault();
                  onMarkAsPaid?.(row.original);
                }}
              >
                <IconChecks className="size-4" stroke={1.5} />
                Marcar como recebida
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                disabled={!onMarkAsPending}
                onSelect={(event) => {
                  event.preventDefault();
                  onMarkAsPending?.(row.original);
                }}
              >
                <DynamicIcon icon="receiptRefund" className="size-4" />
                Marcar como pendente
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={!onDeleteIncome}
              onSelect={(event) => {
                event.preventDefault();
                onDeleteIncome?.(row.original);
              }}
            >
              <DynamicIcon icon="trash" className="size-4" />
              Excluir receita
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    });
  }

  return columns;
}
