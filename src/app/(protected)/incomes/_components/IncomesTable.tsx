"use client";

import { IconRefresh } from "@tabler/icons-react";
import * as React from "react";

import { DataTable } from "@/components/Table";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

import { createIncomeColumns } from "./columnsDef";

export function IncomesTable() {
  const { data, isLoading, isError, refetch, isRefetching } =
    trpc.transactions.list.useQuery({ type: "income" });

  const columns = React.useMemo(() => createIncomeColumns(), []);

  const rows = data ?? [];
  const emptyMessage = isError
    ? "Não foi possível carregar as receitas."
    : "Nenhuma receita cadastrada.";
  const summaryLabel = isError
    ? "Erro ao carregar receitas"
    : rows.length
      ? `${rows.length} ${
          rows.length === 1 ? "receita encontrada" : "receitas registradas"
        }`
      : "Nenhuma receita cadastrada";

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground">{summaryLabel}</span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => refetch()}
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
      data={rows}
      loading={isLoading}
      emptyMessage={emptyMessage}
      toolbarActions={toolbar}
    />
  );
}
