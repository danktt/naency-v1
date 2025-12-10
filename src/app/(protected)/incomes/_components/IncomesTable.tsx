"use client";

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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { useDateStore } from "@/stores/useDateStore";
import { IconCalendar, IconChevronDown } from "@tabler/icons-react";
import type { Row } from "@tanstack/react-table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseAsString, useQueryState } from "nuqs";
import * as React from "react";
import { toast } from "sonner";

import { createIncomeColumns, type IncomeTableRow } from "./columnsDef";

export function IncomesTable() {
  const dateRange = useDateStore((state) => state.dateRange);
  const [editId, setEditId] = useQueryState(
    "edit",
    parseAsString.withDefault(""),
  );
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
  const calendarLocale = ptBR;

  // Abre o modal quando há editId na URL
  React.useEffect(() => {
    if (editId && data && !isEditOpen) {
      const income = data.find((item) => item.id === editId);
      if (income) {
        setEditingIncome(income as IncomeTableRow);
        setIsEditOpen(true);
      } else {
        // Se não encontrou, limpa a URL
        void setEditId("");
      }
    }
  }, [editId, data, isEditOpen, setEditId]);

  const [incomeToDelete, setIncomeToDelete] =
    React.useState<IncomeTableRow | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [incomeToMarkAsPending, setIncomeToMarkAsPending] =
    React.useState<IncomeTableRow | null>(null);
  const [isMarkAsPendingDialogOpen, setIsMarkAsPendingDialogOpen] =
    React.useState(false);
  const [incomeToMarkAsPaid, setIncomeToMarkAsPaid] =
    React.useState<IncomeTableRow | null>(null);
  const [isMarkAsPaidDialogOpen, setIsMarkAsPaidDialogOpen] =
    React.useState(false);
  const [markAsPaidDate, setMarkAsPaidDate] = React.useState<Date>(new Date());
  const [isMarkAsPaidDatePopoverOpen, setIsMarkAsPaidDatePopoverOpen] =
    React.useState(false);

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

  const markAsPendingMutation =
    trpc.transactions.updatePaymentStatus.useMutation({
      onSuccess: () => {
        toast("Receita marcada como pendente.");
        void utils.transactions.list.invalidate(queryInput);
        void utils.transactions.metrics.invalidate();
        void utils.bankAccounts.list.invalidate();
        setIsMarkAsPendingDialogOpen(false);
        setIncomeToMarkAsPending(null);
      },
      onError: (error) => {
        toast(error.message);
      },
    });

  const markAsPaidMutation = trpc.transactions.updatePaymentStatus.useMutation({
    onSuccess: () => {
      toast("Receita marcada como recebida.");
      void utils.transactions.list.invalidate(queryInput);
      void utils.transactions.metrics.invalidate();
      void utils.bankAccounts.list.invalidate();
      setIsMarkAsPaidDialogOpen(false);
      setIncomeToMarkAsPaid(null);
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

  const handleMarkAsPaid = React.useCallback((income: IncomeTableRow) => {
    if (income.isPaid) {
      toast("Esta receita já está marcada como recebida.");
      return;
    }

    setMarkAsPaidDate(income.paidAt ? new Date(income.paidAt) : new Date());
    setIncomeToMarkAsPaid(income);
    setIsMarkAsPaidDatePopoverOpen(false);
    setIsMarkAsPaidDialogOpen(true);
  }, []);

  const confirmMarkAsPaid = React.useCallback(() => {
    if (!incomeToMarkAsPaid) return;
    markAsPaidMutation.mutate({
      id: incomeToMarkAsPaid.id,
      type: "income",
      isPaid: true,
      paidAt: markAsPaidDate,
    });
  }, [incomeToMarkAsPaid, markAsPaidDate, markAsPaidMutation]);

  const handleMarkAsPending = React.useCallback((income: IncomeTableRow) => {
    if (!income.isPaid) {
      toast("Esta receita já está pendente.");
      return;
    }

    setIncomeToMarkAsPending(income);
    setIsMarkAsPendingDialogOpen(true);
  }, []);

  const confirmMarkAsPending = React.useCallback(() => {
    if (!incomeToMarkAsPending) return;
    markAsPendingMutation.mutate({
      id: incomeToMarkAsPending.id,
      type: "income",
      isPaid: false,
      paidAt: null,
    });
  }, [incomeToMarkAsPending, markAsPendingMutation]);

  const handleEditIncome = React.useCallback(
    (income: IncomeTableRow) => {
      setEditingIncome(income);
      setIsEditOpen(true);
      void setEditId(income.id);
    },
    [setEditId],
  );

  const handleEditOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      setIsEditOpen(nextOpen);
      if (!nextOpen) {
        setEditingIncome(null);
        void setEditId("");
      }
    },
    [setEditId],
  );

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
        onMarkAsPaid: handleMarkAsPaid,
        onMarkAsPending: handleMarkAsPending,
      }),
    [
      handleDeleteIncome,
      handleEditIncome,
      handleMarkAsPaid,
      handleMarkAsPending,
    ],
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
              onClick={confirmDeleteIncome}
              disabled={deleteIncomeMutation.isPending}
            >
              {deleteIncomeMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={isMarkAsPaidDialogOpen}
        onOpenChange={(open) => {
          setIsMarkAsPaidDialogOpen(open);
          if (!open) {
            setIncomeToMarkAsPaid(null);
            setIsMarkAsPaidDatePopoverOpen(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar receita como recebida?</AlertDialogTitle>
            <AlertDialogDescription>
              Escolha a data de recebimento para confirmar que esta receita foi
              recebida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <p className="text-sm font-medium">Data do recebimento</p>
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
                : "Marcar como recebida"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={isMarkAsPendingDialogOpen}
        onOpenChange={(open) => {
          setIsMarkAsPendingDialogOpen(open);
          if (!open) {
            setIncomeToMarkAsPending(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar receita como pendente?</AlertDialogTitle>
            <AlertDialogDescription>
              A informação de recebimento será removida e a receita voltará para
              o status pendente.
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
