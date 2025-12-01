"use client";

import { IconRefresh } from "@tabler/icons-react";
import type { Row } from "@tanstack/react-table";
import * as React from "react";

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
      toast("Receita excluída com sucesso.");
      void utils.transactions.list.invalidate(queryInput);
      void utils.bankAccounts.list.invalidate();
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
        onEditIncome: handleEditIncome,
        onDeleteIncome: handleDeleteIncome,
      }),
    [handleDeleteIncome, handleEditIncome],
  );

  const rows = data ?? [];
  const emptyMessage = isError
    ? "Não foi possível carregar as receitas."
    : "Nenhuma receita cadastrada.";

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        emptyMessage={emptyMessage}
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
            <AlertDialogTitle>Excluir receita?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a
              receita selecionada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteIncomeMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteIncome}
              disabled={deleteIncomeMutation.isPending}
            >
              {deleteIncomeMutation.isPending ? "Excluindo..." : "Excluir"}
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
