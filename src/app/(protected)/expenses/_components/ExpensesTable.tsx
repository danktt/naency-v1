"use client";

import {
  IconCalendar,
  IconChevronDown,
  IconRefresh,
} from "@tabler/icons-react";
import type { Row } from "@tanstack/react-table";
import { format } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";
import * as React from "react";
import { useTranslation } from "react-i18next";
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
  const { t, i18n } = useTranslation("expenses");
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
  const calendarLocale = React.useMemo(
    () => (i18n.language?.startsWith("pt") ? ptBR : enUS),
    [i18n.language],
  );

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
  const deleteExpenseMutation = trpc.transactions.delete.useMutation({
    onSuccess: () => {
      toast(
        t("table.toast.deleteSuccess", {
          defaultValue: "Expense deleted successfully.",
        }),
      );
      void utils.transactions.list.invalidate(queryInput);
      setIsDeleteDialogOpen(false);
      setExpenseToDelete(null);
    },
    onError: (error) => {
      toast(error.message);
    },
  });
  const markAsPaidMutation = trpc.transactions.updatePaymentStatus.useMutation({
    onSuccess: () => {
      toast(
        t("table.toast.markAsPaidSuccess", {
          defaultValue: "Expense marked as paid.",
        }),
      );
      void utils.transactions.list.invalidate(queryInput);
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
        toast(
          t("table.toast.markAsPendingSuccess", {
            defaultValue: "Expense marked as pending.",
          }),
        );
        void utils.transactions.list.invalidate(queryInput);
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

  const handleMarkAsPaid = React.useCallback(
    (expense: ExpenseTableRow) => {
      if (expense.isPaid) {
        toast(
          t("table.toast.alreadyPaid", {
            defaultValue: "This expense is already marked as paid.",
          }),
        );
        return;
      }

      if (expense.method === "credit") {
        toast.info(
          t("table.toast.creditCardPaymentInfo", {
            defaultValue:
              "Despesas de cartão de crédito são pagas através da fatura.",
          }),
        );
        return;
      }

      setMarkAsPaidDate(expense.paidAt ? new Date(expense.paidAt) : new Date());
      setExpenseToMarkAsPaid(expense);
      setIsMarkAsPaidDatePopoverOpen(false);
      setIsMarkAsPaidDialogOpen(true);
    },
    [t],
  );

  const confirmMarkAsPaid = React.useCallback(() => {
    if (!expenseToMarkAsPaid) return;
    markAsPaidMutation.mutate({
      id: expenseToMarkAsPaid.id,
      type: "expense",
      isPaid: true,
      paidAt: markAsPaidDate,
    });
  }, [expenseToMarkAsPaid, markAsPaidDate, markAsPaidMutation]);

  const handleMarkAsPending = React.useCallback(
    (expense: ExpenseTableRow) => {
      if (!expense.isPaid) {
        toast(
          t("table.toast.alreadyPending", {
            defaultValue: "This expense is already pending.",
          }),
        );
        return;
      }

      setExpenseToMarkAsPending(expense);
      setIsMarkAsPendingDialogOpen(true);
    },
    [t],
  );

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
        t,
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
      t,
    ],
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
            setExpenseToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("table.delete.title", {
                defaultValue: "Delete expense?",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("table.delete.description", {
                defaultValue:
                  "This action cannot be undone. This will permanently delete the selected expense.",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteExpenseMutation.isPending}>
              {t("table.delete.cancel", { defaultValue: "Cancel" })}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteExpense}
              disabled={deleteExpenseMutation.isPending}
            >
              {deleteExpenseMutation.isPending
                ? t("table.delete.loading", { defaultValue: "Deleting..." })
                : t("table.delete.confirm", { defaultValue: "Delete" })}
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
            <AlertDialogTitle>
              {t("table.markAsPaid.title", {
                defaultValue: "Marcar despesa como paga?",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("table.markAsPaid.description", {
                defaultValue:
                  "Escolha a data de pagamento para confirmar que esta despesa foi quitada.",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {t("table.markAsPaid.dateLabel", {
                defaultValue: "Data do pagamento",
              })}
            </p>
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
                    : t("table.markAsPaid.datePlaceholder", {
                        defaultValue: "Selecione uma data",
                      })}
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
              {t("table.markAsPaid.cancel", { defaultValue: "Cancelar" })}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmMarkAsPaid}
              disabled={markAsPaidMutation.isPending}
            >
              {markAsPaidMutation.isPending
                ? t("table.markAsPaid.loading", {
                    defaultValue: "Atualizando...",
                  })
                : t("table.markAsPaid.confirm", {
                    defaultValue: "Marcar como pago",
                  })}
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
            <AlertDialogTitle>
              {t("table.markAsPending.title", {
                defaultValue: "Marcar despesa como pendente?",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("table.markAsPending.description", {
                defaultValue:
                  "A informação de pagamento será removida e a despesa voltará para o status pendente.",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={markAsPendingMutation.isPending}>
              {t("table.markAsPending.cancel", { defaultValue: "Cancelar" })}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmMarkAsPending}
              disabled={markAsPendingMutation.isPending}
            >
              {markAsPendingMutation.isPending
                ? t("table.markAsPending.loading", {
                    defaultValue: "Atualizando...",
                  })
                : t("table.markAsPending.confirm", {
                    defaultValue: "Marcar como pendente",
                  })}
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
