"use client";

import { IconRefresh } from "@tabler/icons-react";
import type { Row } from "@tanstack/react-table";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { toast } from "sonner";

import { IncomesForm } from "@/components/forms/incomesForm";
import { DataTable } from "@/components/Table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { useDateStore } from "@/stores/useDateStore";

import { createIncomeColumns, type IncomeTableRow } from "./columnsDef";

export function IncomesTable() {
  const { t } = useTranslation("incomes");
  const dateRange = useDateStore((state) => state.dateRange);
  const [editingIncome, setEditingIncome] =
    React.useState<IncomeTableRow | null>(null);
  const [isEditOpen, setIsEditOpen] = React.useState(false);

  const queryInput = React.useMemo(
    () => ({
      type: "income" as const,
      dateRange: {
        from: dateRange.from,
        to: dateRange.to,
      },
    }),
    [dateRange],
  );

  const { data, isLoading, isError, refetch, isRefetching } =
    trpc.transactions.list.useQuery(queryInput);
  const utils = trpc.useUtils();

  const [incomeToDelete, setIncomeToDelete] =
    React.useState<IncomeTableRow | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const deleteIncomeMutation = trpc.transactions.delete.useMutation({
    onSuccess: () => {
      toast(
        t("table.toast.deleteSuccess", {
          defaultValue: "Income deleted successfully.",
        }),
      );
      void utils.transactions.list.invalidate(queryInput);
      setIsDeleteDialogOpen(false);
      setIncomeToDelete(null);
    },
    onError: (error) => {
      toast(error.message);
    },
  });

  const handleDeleteIncome = React.useCallback((income: IncomeTableRow) => {
    setIncomeToDelete(income);
    setIsDeleteDialogOpen(true);
  }, []);

  const confirmDeleteIncome = React.useCallback(() => {
    if (!incomeToDelete) return;
    deleteIncomeMutation.mutate({ id: incomeToDelete.id, type: "income" });
  }, [deleteIncomeMutation, incomeToDelete]);

  const handleEditIncome = React.useCallback((income: IncomeTableRow) => {
    setEditingIncome(income);
    setIsEditOpen(true);
  }, []);

  const handleEditOpenChange = React.useCallback((nextOpen: boolean) => {
    setIsEditOpen(nextOpen);
    if (!nextOpen) {
      setEditingIncome(null);
    }
  }, []);

  const handleRowClick = React.useCallback(
    (row: Row<IncomeTableRow>) => {
      handleEditIncome(row.original);
    },
    [handleEditIncome],
  );

  const columns = React.useMemo(
    () =>
      createIncomeColumns({
        t,
        onEditIncome: handleEditIncome,
        onDeleteIncome: handleDeleteIncome,
      }),
    [handleDeleteIncome, handleEditIncome, t],
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
        onRowClick={handleRowClick}
      />
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setIncomeToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("table.delete.title", {
                defaultValue: "Delete income?",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("table.delete.description", {
                defaultValue:
                  "This action cannot be undone. This will permanently delete the selected income.",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteIncomeMutation.isPending}>
              {t("table.delete.cancel", { defaultValue: "Cancel" })}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteIncome}
              disabled={deleteIncomeMutation.isPending}
            >
              {deleteIncomeMutation.isPending
                ? t("table.delete.loading", { defaultValue: "Deleting..." })
                : t("table.delete.confirm", { defaultValue: "Delete" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {editingIncome ? (
        <IncomesForm
          mode="edit"
          income={editingIncome}
          open={isEditOpen}
          onOpenChange={handleEditOpenChange}
          trigger={null}
        />
      ) : null}
    </>
  );
}
