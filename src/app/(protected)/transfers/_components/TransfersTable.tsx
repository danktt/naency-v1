"use client";

import { IconRefresh } from "@tabler/icons-react";
import * as React from "react";

import { DataTable } from "@/components/Table";
import { Button } from "@/components/ui/button";

import { createTransferColumns, type TransferTableRow } from "./columnsDef";

type TransfersTableProps = {
  data: TransferTableRow[];
  loading?: boolean;
  isRefetching?: boolean;
  emptyMessage: string;
  summaryLabel: string;
  onRefresh: () => void;
  onEdit: (transfer: TransferTableRow) => void;
  onDelete: (transfer: TransferTableRow) => void;
};

export function TransfersTable({
  data,
  loading = false,
  isRefetching = false,
  emptyMessage,
  summaryLabel,
  onRefresh,
  onEdit,
  onDelete,
}: TransfersTableProps) {
  const columns = React.useMemo(
    () =>
      createTransferColumns({
        onEditTransfer: onEdit,
        onDeleteTransfer: onDelete,
      }),
    [onDelete, onEdit],
  );

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground">{summaryLabel}</span>
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        isLoading={isRefetching}
        icon={<IconRefresh className="size-4" />}
      >
        Atualizar
      </Button>
    </div>
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      loading={loading}
      emptyMessage={emptyMessage}
      toolbarActions={toolbar}
      enableColumnVisibility={false}
      enableRowSelection={false}
      storageKey="transfers-table"
    />
  );
}
