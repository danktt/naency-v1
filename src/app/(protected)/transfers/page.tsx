"use client";
import { IconPlus } from "@tabler/icons-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import type { TransferTableRow } from "./_components/columnsDef";
import { TransferFormDialog } from "./_components/TransferFormDialog";
import { TransfersTable } from "./_components/TransfersTable";

export default function TransfersPage() {
  const { t, i18n } = useTranslation("transfers");
  const utils = trpc.useUtils();

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
  const effectiveLanguage = isMounted
    ? (i18n.language ?? fallbackLng)
    : fallbackLng;

  const now = React.useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = React.useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = React.useState(now.getFullYear());
  const [selectedAccount, setSelectedAccount] = React.useState<string | null>(
    null,
  );

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editingTransfer, setEditingTransfer] =
    React.useState<TransferTableRow | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [transferToDelete, setTransferToDelete] =
    React.useState<TransferTableRow | null>(null);

  const monthFormatter = React.useMemo(
    () =>
      new Intl.DateTimeFormat(effectiveLanguage ?? "en-US", {
        month: "long",
      }),
    [effectiveLanguage],
  );

  const monthOptions = React.useMemo(
    () =>
      Array.from({ length: 12 }).map((_, index) => {
        const label = monthFormatter.format(new Date(2020, index, 1));
        const capitalized = label.charAt(0).toUpperCase() + label.slice(1);
        return {
          value: (index + 1).toString(),
          label: capitalized,
        };
      }),
    [monthFormatter],
  );

  const filters = React.useMemo(
    () => ({
      month: selectedMonth,
      year: selectedYear,
      accountId: selectedAccount ?? undefined,
    }),
    [selectedAccount, selectedMonth, selectedYear],
  );

  const anyAccountValue = "__all__";
  const accountSelectValue = selectedAccount ?? anyAccountValue;

  const transfersQuery = trpc.transactions.listTransfers.useQuery(filters);
  const accountsQuery = trpc.accounts.list.useQuery();

  const transfers = transfersQuery.data ?? [];
  const emptyMessage = transfersQuery.isError
    ? translate("table.emptyError")
    : translate("table.empty");
  const summaryLabel = transfersQuery.isError
    ? translate("table.summaryError")
    : transfers.length
      ? translate("table.summary", { count: transfers.length })
      : translate("table.summaryEmpty");

  const deleteMutation = trpc.transactions.deleteTransfer.useMutation({
    onSuccess: async () => {
      toast.success(translate("delete.toast.success"));
      await utils.transactions.listTransfers.invalidate();
      setIsDeleteOpen(false);
      setTransferToDelete(null);
    },
    onError: (err) => {
      toast.error(err.message ?? translate("delete.toast.error"));
    },
  });

  const handleDelete = React.useCallback(() => {
    if (!transferToDelete) return;
    deleteMutation.mutate({ id: transferToDelete.id });
  }, [deleteMutation, transferToDelete]);

  const handleEditTransfer = (transfer: TransferTableRow) => {
    setEditingTransfer(transfer);
    setIsEditOpen(true);
  };

  const handleDeleteTransfer = (transfer: TransferTableRow) => {
    setTransferToDelete(transfer);
    setIsDeleteOpen(true);
  };

  const accountOptions = accountsQuery.data ?? [];

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">
            {translate("header.title")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {translate("header.subtitle")}
          </p>
        </div>
        <TransferFormDialog
          trigger={
            <Button className="gap-2">
              <IconPlus className="size-4" />
              {translate("header.new")}
            </Button>
          }
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSuccess={async () => {
            await transfersQuery.refetch();
          }}
        />
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {translate("filters.month")}
            </span>
            <Select
              value={selectedMonth.toString()}
              onValueChange={(value) => setSelectedMonth(Number(value))}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={translate("filters.monthPlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {translate("filters.year")}
            </span>
            <Input
              type="number"
              inputMode="numeric"
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              min={2000}
              max={2100}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {translate("filters.account")}
            </span>
            <Select
              value={accountSelectValue}
              onValueChange={(value) =>
                setSelectedAccount(value === anyAccountValue ? null : value)
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={translate("filters.accountPlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={anyAccountValue}>
                  {translate("filters.allAccounts")}
                </SelectItem>
                {accountOptions.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <TransfersTable
        data={transfers}
        loading={transfersQuery.isLoading}
        isRefetching={transfersQuery.isRefetching}
        emptyMessage={emptyMessage}
        summaryLabel={summaryLabel}
        onRefresh={() => void transfersQuery.refetch()}
        onEdit={handleEditTransfer}
        onDelete={handleDeleteTransfer}
      />

      <TransferFormDialog
        mode="edit"
        transfer={editingTransfer ?? undefined}
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setEditingTransfer(null);
          }
        }}
        onSuccess={async () => {
          await transfersQuery.refetch();
        }}
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{translate("delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {translate("delete.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {translate("delete.actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending
                ? translate("delete.actions.loading")
                : translate("delete.actions.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
