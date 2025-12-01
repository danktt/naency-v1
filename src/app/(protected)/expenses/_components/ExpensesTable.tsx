"use client";

import { IconCalendar, IconChevronDown } from "@tabler/icons-react";
import type { Row } from "@tanstack/react-table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as React from "react";
import { toast } from "sonner";
import { ExpensesForm } from "@/components/forms/expensesForm";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { useDateStore } from "@/stores/useDateStore";

import { createExpenseColumns, type ExpenseTableRow } from "./columnsDef";

export function ExpensesTable() {
  const dateRange = useDateStore((state) => state.dateRange);
  const [editingExpense, setEditingExpense] =
    React.useState<ExpenseTableRow | null>(null);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [expenseToDelete, setExpenseToDelete] =
    React.useState<ExpenseTableRow | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [expenseToMarkAsPaid, setExpenseToMarkAsPaid] =
    React.useState<ExpenseTableRow | null>(null);
  const [isMarkAsPaidDialogOpen, setIsMarkAsPaidDialogOpen] =
    React.useState(false);
  const [markAsPaidDate, setMarkAsPaidDate] = React.useState<Date>(new Date());
  const [isMarkAsPaidDatePopoverOpen, setIsMarkAsPaidDatePopoverOpen] =
    React.useState(false);
  const [expenseToMarkAsPending, setExpenseToMarkAsPending] =
    React.useState<ExpenseTableRow | null>(null);
  const [isMarkAsPendingDialogOpen, setIsMarkAsPendingDialogOpen] =
    React.useState(false);
  const utils = trpc.useUtils();
  const calendarLocale = ptBR;

  const queryInput = React.useMemo(
    () => ({
      type: "expense" as const,
      dateRange: {
        from: dateRange.from,
        to: dateRange.to,
      },
      excludeCreditCard: true,
    }),
    [dateRange],
  );

  const { data, isLoading, isError, refetch, isRefetching } =
    trpc.transactions.list.useQuery(queryInput);
  const deleteExpenseMutation = trpc.transactions.delete.useMutation({
    onSuccess: () => {
      toast("Despesa deletada com sucesso.");
      void utils.transactions.list.invalidate(queryInput);
      void utils.bankAccounts.list.invalidate();
      setIsDeleteDialogOpen(false);
      setExpenseToDelete(null);
    },
    onError: (error) => {
      toast(error.message);
    },
  });
  const markAsPaidMutation = trpc.transactions.updatePaymentStatus.useMutation({
    onSuccess: () => {
      toast("Despesa marcada como paga.");
      void utils.transactions.list.invalidate(queryInput);
      void utils.bankAccounts.list.invalidate();
      setIsMarkAsPaidDialogOpen(false);
      setExpenseToMarkAsPaid(null);
    },
    onError: (error) => {
      toast(error.message);
    },
  });
  const markAsPendingMutation =
    trpc.transactions.updatePaymentStatus.useMutation({
      onSuccess: () => {
        toast("Despesa marcada como pendente.");
        void utils.transactions.list.invalidate(queryInput);
        void utils.bankAccounts.list.invalidate();
        setIsMarkAsPendingDialogOpen(false);
        setExpenseToMarkAsPending(null);
      },
      onError: (error) => {
        toast(error.message);
      },
    });

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

  const handleRowClick = React.useCallback(
    (row: Row<ExpenseTableRow>) => {
      handleEditExpense(row.original);
    },
    [handleEditExpense],
  );

  const handleDeleteExpense = React.useCallback((expense: ExpenseTableRow) => {
    setExpenseToDelete(expense);
    setIsDeleteDialogOpen(true);
  }, []);

  const confirmDeleteExpense = React.useCallback(() => {
    if (!expenseToDelete) return;
    deleteExpenseMutation.mutate({ id: expenseToDelete.id, type: "expense" });
  }, [deleteExpenseMutation, expenseToDelete]);

  const handleMarkAsPaid = React.useCallback((expense: ExpenseTableRow) => {
    if (expense.isPaid) {
      toast("Esta despesa já está marcada como paga.");
      return;
    }

    if (expense.method === "credit") {
      toast.info("Despesas de cartão de crédito são pagas através da fatura.");
      return;
    }

    setMarkAsPaidDate(expense.paidAt ? new Date(expense.paidAt) : new Date());
    setExpenseToMarkAsPaid(expense);
    setIsMarkAsPaidDatePopoverOpen(false);
    setIsMarkAsPaidDialogOpen(true);
  }, []);

  const confirmMarkAsPaid = React.useCallback(() => {
    if (!expenseToMarkAsPaid) return;
    markAsPaidMutation.mutate({
      id: expenseToMarkAsPaid.id,
      type: "expense",
      isPaid: true,
      paidAt: markAsPaidDate,
    });
  }, [expenseToMarkAsPaid, markAsPaidDate, markAsPaidMutation]);

  const handleMarkAsPending = React.useCallback((expense: ExpenseTableRow) => {
    if (!expense.isPaid) {
      toast("Esta despesa já está pendente.");
      return;
    }

    setExpenseToMarkAsPending(expense);
    setIsMarkAsPendingDialogOpen(true);
  }, []);

  const confirmMarkAsPending = React.useCallback(() => {
    if (!expenseToMarkAsPending) return;
    markAsPendingMutation.mutate({
      id: expenseToMarkAsPending.id,
      type: "expense",
      isPaid: false,
      paidAt: null,
    });
  }, [expenseToMarkAsPending, markAsPendingMutation]);

  const columns = React.useMemo(
    () =>
      createExpenseColumns({
        onEditExpense: handleEditExpense,
        onDeleteExpense: handleDeleteExpense,
        onMarkAsPaid: handleMarkAsPaid,
        onMarkAsPending: handleMarkAsPending,
      }),
    [
      handleDeleteExpense,
      handleEditExpense,
      handleMarkAsPaid,
      handleMarkAsPending,
    ],
  );

  const rows = data ?? [];
  const emptyMessage = isError
    ? "Não foi possível carregar as despesas."
    : "Nenhuma despesa cadastrada.";

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
            setExpenseToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar despesa?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Isso excluirá permanentemente a
              despesa selecionada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteExpenseMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteExpense}
              disabled={deleteExpenseMutation.isPending}
            >
              {deleteExpenseMutation.isPending ? "Deletando..." : "Deletar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isMarkAsPaidDialogOpen}
        onOpenChange={(open) => {
          setIsMarkAsPaidDialogOpen(open);
          if (!open) {
            setExpenseToMarkAsPaid(null);
            setIsMarkAsPaidDatePopoverOpen(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar despesa como paga?</AlertDialogTitle>
            <AlertDialogDescription>
              Escolha a data de pagamento para confirmar que esta despesa foi
              quitada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <p className="text-sm font-medium">Data do pagamento</p>
            <Popover
              open={isMarkAsPaidDatePopoverOpen}
              onOpenChange={setIsMarkAsPaidDatePopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !markAsPaidDate && "text-muted-foreground",
                  )}
                >
                  <IconCalendar className="mr-2 size-4" />
                  {markAsPaidDate
                    ? format(markAsPaidDate, "PPP", {
                        locale: calendarLocale,
                      })
                    : "Selecione uma data"}
                  <IconChevronDown className="ml-auto size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={markAsPaidDate}
                  onSelect={(date) => {
                    if (!date) return;
                    setMarkAsPaidDate(date);
                    setIsMarkAsPaidDatePopoverOpen(false);
                  }}
                  defaultMonth={markAsPaidDate ?? new Date()}
                  locale={calendarLocale}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={markAsPaidMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmMarkAsPaid}
              disabled={markAsPaidMutation.isPending}
            >
              {markAsPaidMutation.isPending
                ? "Atualizando..."
                : "Marcar como pago"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={isMarkAsPendingDialogOpen}
        onOpenChange={(open) => {
          setIsMarkAsPendingDialogOpen(open);
          if (!open) {
            setExpenseToMarkAsPending(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar despesa como pendente?</AlertDialogTitle>
            <AlertDialogDescription>
              A informação de pagamento será removida e a despesa voltará para o
              status pendente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={markAsPendingMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmMarkAsPending}
              disabled={markAsPendingMutation.isPending}
            >
              {markAsPendingMutation.isPending
                ? "Atualizando..."
                : "Marcar como pendente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
