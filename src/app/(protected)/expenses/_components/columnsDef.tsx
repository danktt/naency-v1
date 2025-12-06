"use client";

import {
  IconCalendar,
  IconChecks,
  IconCircle,
  IconCreditCard,
  IconDotsVertical,
  IconPencil,
  IconReceiptRefund,
  IconRepeat,
  IconTrash,
} from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
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

type CreateExpenseColumnsParams = ExpenseColumnsOptions;

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
function getDateValue(tx: ExpenseTableRow): string {
  if (!tx.date) return "";
  return formatDate(new Date(tx.date));
}

// Helper function to get status label for filtering
function getStatusLabel(tx: ExpenseTableRow): string {
  const isRecurring = Boolean(tx.recurringId);
  const isInstallment = Boolean(tx.installmentGroupId);
  const isPaid = Boolean(tx.isPaid);

  if (isInstallment) {
    return `Parcela ${tx.installmentNumber} de ${tx.totalInstallments}`;
  }

  if (isRecurring) {
    return "Recorrente";
  }

  if (!isPaid) {
    return "Pendente";
  }

  const expectedDate = tx.date ? new Date(tx.date) : null;
  const paidAtDate = tx.paidAt ? new Date(tx.paidAt) : null;

  if (!expectedDate || !paidAtDate) {
    return "Pago";
  }

  const normalizeDate = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();

  const expectedTime = normalizeDate(expectedDate);
  const paidTime = normalizeDate(paidAtDate);

  if (paidTime === expectedTime) {
    return "Pago";
  }
  if (paidTime > expectedTime) {
    return "Pago atrasado";
  }
  return "Pago antecipadamente";
}

export function createExpenseColumns(
  options: CreateExpenseColumnsParams,
): ColumnDef<ExpenseTableRow>[] {
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
      id: "date",
      header: "Data",
      accessorFn: (row) => getDateValue(row),
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
            <span>Sem data</span>
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      accessorFn: (row) => getStatusLabel(row),
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

          const statusLabels: Record<PaymentStatus, string> = {
            pending: "Pendente",
            paidOnTime: "Pago",
            paidLate: "Pago atrasado",
            paidEarly: "Pago antecipadamente",
            paid: "Pago",
          };

          badgeClass = paymentClassMap[paymentStatus];
          badgeIcon = (
            <IconCircle
              className={cn(
                "size-2 shrink-0",
                paymentIconClassMap[paymentStatus],
              )}
            />
          );
          badgeLabel = statusLabels[paymentStatus];
        } else if (isInstallment) {
          badgeClass =
            "border-amber-400/40 bg-amber-400/10 text-amber-500 flex items-center gap-1";
          badgeIcon = (
            <IconCreditCard className="size-3 text-amber-500 shrink-0" />
          );
          badgeLabel = `Parcela ${tx.installmentNumber} de ${tx.totalInstallments}`;
        } else if (isRecurring) {
          badgeClass =
            "border-blue-400/40 bg-blue-400/10 text-blue-500 flex items-center gap-1";
          badgeIcon = <IconRepeat className="size-3 text-blue-500 shrink-0" />;
          badgeLabel = "Recorrente";
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
      header: "Valor",
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
      header: "Pago em",
      cell: ({ row }) => {
        const isPaid = row.original.isPaid;
        const paidAt = row.original.paidAt
          ? new Date(row.original.paidAt)
          : null;

        if (!isPaid) {
          return <Badge variant="muted">Ainda não pago</Badge>;
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
      header: "Descrição",
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
              <IconDotsVertical />
              <span className="sr-only">Abrir menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled={!onEditExpense}
              onSelect={(event) => {
                event.preventDefault();
                onEditExpense?.(row.original);
              }}
            >
              <IconPencil className="size-4" stroke={1.5} />
              Editar despesa
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
                Marcar como pago
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                disabled={!onMarkAsPending}
                onSelect={(event) => {
                  event.preventDefault();
                  onMarkAsPending?.(row.original);
                }}
              >
                <IconReceiptRefund className="size-4" stroke={1.5} />
                Marcar como pendente
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
              <IconTrash className="size-4" stroke={1.5} />
              Deletar despesa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    });
  }

  return columns;
}
