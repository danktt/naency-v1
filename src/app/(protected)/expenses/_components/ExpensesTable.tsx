"use client";

import { IconRefresh } from "@tabler/icons-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { ExpensesForm } from "@/components/forms/expensesForm";
import { DataTable } from "@/components/Table";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { useDateStore } from "@/stores/useDateStore";

import { createExpenseColumns, type ExpenseTableRow } from "./columnsDef";

export function ExpensesTable() {
  const { t } = useTranslation("expenses");
  const dateRange = useDateStore((state) => state.dateRange);
  const [editingExpense, setEditingExpense] =
    React.useState<ExpenseTableRow | null>(null);
  const [isEditOpen, setIsEditOpen] = React.useState(false);

  const queryInput = React.useMemo(
    () => ({
      type: "expense" as const,
      dateRange: {
        from: dateRange.from,
        to: dateRange.to,
      },
    }),
    [dateRange],
  );

  const { data, isLoading, isError, refetch, isRefetching } =
    trpc.transactions.list.useQuery(queryInput);

  const handleEditExpense = React.useCallback((expense: ExpenseTableRow) => {
    setEditingExpense(expense);
    setIsEditOpen(true);
  }, []);

  const handleEditOpenChange = React.useCallback((nextOpen: boolean) => {
    setIsEditOpen(nextOpen);
    if (!nextOpen) {
      setEditingExpense(null);
    }
  }, []);

  const columns = React.useMemo(
    () =>
      createExpenseColumns({
        t,
        onEditExpense: handleEditExpense,
      }),
    [handleEditExpense, t],
  );

  const rows = data ?? [];
  const emptyMessage = isError ? t("table.emptyError") : t("table.empty");
  const summaryLabel = isError
    ? t("table.summaryError")
    : rows.length
      ? t("table.summary", { count: rows.length })
      : t("table.summaryEmpty");

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
        {t("table.refresh")}
      </Button>
    </div>
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        emptyMessage={emptyMessage}
        toolbarActions={toolbar}
      />
      {editingExpense ? (
        <ExpensesForm
          mode="edit"
          expense={editingExpense}
          open={isEditOpen}
          onOpenChange={handleEditOpenChange}
          trigger={null}
        />
      ) : null}
    </>
  );
}

