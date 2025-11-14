"use client";

import { IconRefresh } from "@tabler/icons-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

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
  const { t, i18n } = useTranslation("transfers");
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const fallbackLng =
    (Array.isArray(i18n.options?.fallbackLng) && i18n.options.fallbackLng[0]) ||
    (typeof i18n.options?.fallbackLng === "string"
      ? i18n.options.fallbackLng
      : "en");

  const fallbackT = React.useMemo(
    () => i18n.getFixedT(fallbackLng, "transfers"),
    [i18n, fallbackLng],
  );

  const translate = isMounted ? t : fallbackT;

  const columns = React.useMemo(
    () =>
      createTransferColumns({
        t: translate,
        onEditTransfer: onEdit,
        onDeleteTransfer: onDelete,
      }),
    [onDelete, onEdit, translate],
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
        {translate("table.refresh")}
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
