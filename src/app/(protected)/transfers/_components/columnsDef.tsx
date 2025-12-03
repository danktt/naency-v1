import {
  IconCalendar,
  IconPencil,
  IconRepeat,
  IconTrash,
} from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/helpers/formatCurrency";
import { formatDate } from "@/helpers/formatDate";
import type { AppRouter } from "@/server/api/root";

type RouterOutput = inferRouterOutputs<AppRouter>;
export type TransferTableRow =
  RouterOutput["transactions"]["listTransfers"][number];

type CreateTransferColumnsParams = {
  onEditTransfer?: (transfer: TransferTableRow) => void;
  onDeleteTransfer?: (transfer: TransferTableRow) => void;
};

export function createTransferColumns({
  onEditTransfer,
  onDeleteTransfer,
}: CreateTransferColumnsParams): ColumnDef<TransferTableRow>[] {
  return [
    {
      accessorKey: "date",
      header: "Data",
      cell: ({ row }) => {
        const transfer = row.original;
        const date = transfer.date ? new Date(transfer.date) : null;
        if (!date) {
          return (
            <div className="flex items-center gap-2 text-muted-foreground">
              <IconCalendar className="size-4" />
              <span>Sem data</span>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconCalendar className="size-4 text-primary" />
            <span>{formatDate(date)}</span>
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
          <div className="font-mono font-semibold text-primary">
            {formatCurrency(amount)}
          </div>
        );
      },
    },
    {
      accessorKey: "description",
      header: "Descrição",
      cell: ({ row }) => {
        const description = row.getValue("description");
        if (!description) {
          return <span className="text-sm text-muted-foreground">-</span>;
        }

        return (
          <p
            className="max-w-[220px] truncate capitalize"
            title={String(description)}
          >
            {String(description)}
          </p>
        );
      },
    },
    {
      accessorKey: "fromAccountName",
      header: "Conta de origem",
      cell: ({ row }) => {
        const fromAccount = row.original.fromAccountName;
        if (!fromAccount) {
          return (
            <span className="text-sm text-muted-foreground">-</span>
          );
        }

        return <Badge variant="secondary">{fromAccount}</Badge>;
      },
    },
    {
      accessorKey: "toAccountName",
      header: "Conta de destino",
      cell: ({ row }) => {
        const toAccount = row.original.toAccountName;
        if (!toAccount) {
          return (
            <span className="text-sm text-muted-foreground">-</span>
          );
        }

        return (
          <Badge variant="secondary" className="gap-1">
            <IconRepeat className="size-3" />
            {toAccount}
          </Badge>
        );
      },
    },
    ...(onEditTransfer || onDeleteTransfer
      ? [
          {
            id: "actions",
            header: "Ações",
            cell: ({ row }: { row: { original: TransferTableRow } }) => (
              <div className="flex items-center gap-1">
                {onEditTransfer ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => onEditTransfer(row.original)}
                    title="Editar transferência"
                  >
                    <IconPencil className="size-4" />
                  </Button>
                ) : null}
                {onDeleteTransfer ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => onDeleteTransfer(row.original)}
                    title="Excluir transferência"
                  >
                    <IconTrash className="size-4" />
                  </Button>
                ) : null}
              </div>
            ),
          } satisfies ColumnDef<TransferTableRow>,
        ]
      : []),
  ];
}
