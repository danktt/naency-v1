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

import { Badge, CategoryBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCentsBRL, formatCurrency } from "@/helpers/formatCurrency";
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

const paymentMethodLabels: Record<IncomeTableRow["method"], string> = {
  pix: "Pix",
  transfer: "Transferência",
  debit: "Débito",
  credit: "Crédito",
  cash: "Dinheiro",
  boleto: "Boleto",
  investment: "Investimento",
};

export function createIncomeColumns(
  options: IncomeColumnsOptions = {},
): ColumnDef<IncomeTableRow>[] {
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
      header: "Data",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <IconCalendar className="size-4" />
          {formatDate(row.original.date)}
        </div>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
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
      header: "Description",
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
      header: "Account",
      cell: ({ row }) => {
        const account =
          getAccountName?.(row.original) ?? row.original.accountName;
        if (!account) return "-";
        return <Badge variant="secondary">{account as string}</Badge>;
      },
    },
    {
      id: "mode",
      header: "Type",
      cell: ({ row }) => {
        const t = row.original;

        let icon = <IconCircle className="size-3" />;
        let label = "Unique";
        let color = "secondary";

        if (t.recurringId) {
          icon = <IconRepeat className="size-3" />;
          label = "Recurring";
          color = "success";
        } else if (t.installmentGroupId) {
          icon = <IconCreditCard className="size-3" />;
          label = `Installment ${t.installmentNumber}/${t.totalInstallments}`;
          color = "warning";
        }

        return (
          <Badge variant={color} className="flex items-center gap-1">
            {icon}
            {label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "categoryName",
      header: "Category",
      cell: ({ row }) => {
        const category =
          getCategoryMeta?.(row.original) ?? row.original.categoryName;
        if (!category) return "-";
        return <Badge variant="secondary">{category as string}</Badge>;
      },
    },

    {
      accessorKey: "method",
      header: "Method",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {paymentMethodLabels[row.original.method] ?? row.original.method}
        </Badge>
      ),
    },
  ];

  if (hasActions) {
    columns.push({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {onViewIncome ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewIncome(row.original)}
              title="Ver receita"
            >
              <IconEye className="size-4" />
            </Button>
          ) : null}
          {onEditIncome ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditIncome(row.original)}
              title="Editar receita"
            >
              <IconEdit className="size-4" />
            </Button>
          ) : null}
          {onDeleteIncome ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteIncome(row.original)}
              title="Excluir receita"
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
