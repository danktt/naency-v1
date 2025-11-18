"use client";

import { IconPlus } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { AccountDetailsPanel } from "./_components/AccountDetailsPanel";
import { AccountFormDialog } from "./_components/AccountFormDialog";
import { AccountsList } from "./_components/AccountsList";
import { defaultFormValues } from "./_components/constants";
import { DeleteAccountDialog } from "./_components/DeleteAccountDialog";
import { StatisticsCards } from "./_components/StatisticsCards";
import type { AccountFormValues, BankAccount } from "./_components/types";
import { parseInitialBalance } from "./_components/utils";

export default function BankAccountsPage() {
  const utils = trpc.useUtils();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(
    null,
  );
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(
    null,
  );
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(
    null,
  );

  const bankAccountsQuery = trpc.bankAccounts.list.useQuery();
  const accounts = bankAccountsQuery.data ?? [];

  const createMutation = trpc.bankAccounts.create.useMutation({
    onSuccess: async () => {
      toast.success("Account created successfully.");
      setIsCreateOpen(false);
      await utils.bankAccounts.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message ?? "Unable to create the account.");
    },
  });

  const updateMutation = trpc.bankAccounts.update.useMutation({
    onSuccess: async () => {
      toast.success("Account updated.");
      setIsEditOpen(false);
      setEditingAccount(null);
      await utils.bankAccounts.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message ?? "Unable to update the account.");
    },
  });

  const deleteMutation = trpc.bankAccounts.delete.useMutation({
    onSuccess: async () => {
      toast.success("Account deleted.");
      setIsDeleteOpen(false);
      setAccountToDelete(null);
      if (selectedAccount?.id === accountToDelete?.id) {
        setSelectedAccount(null);
      }
      await utils.bankAccounts.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message ?? "Unable to delete the account.");
    },
  });

  // Calculate statistics
  const stats = useMemo(() => {
    if (!accounts.length) {
      return {
        totalBalance: 0,
        activeAccounts: 0,
        averageBalance: 0,
        totalAccounts: 0,
      };
    }

    const totalBalance = accounts.reduce((sum, account) => {
      return sum + parseInitialBalance(account.initial_balance);
    }, 0);

    const activeAccounts = accounts.length;
    const averageBalance = totalBalance / activeAccounts;

    return {
      totalBalance,
      activeAccounts,
      averageBalance,
      totalAccounts: accounts.length,
    };
  }, [accounts]);

  // Auto-select first account if none selected
  useEffect(() => {
    if (!selectedAccount && accounts.length > 0) {
      setSelectedAccount(accounts[0] ?? null);
    }
  }, [accounts, selectedAccount]);

  const isLoading = bankAccountsQuery.isLoading;

  const handleOpenCreate = () => {
    setIsCreateOpen(true);
  };

  const handleEditAccount = (account: BankAccount) => {
    setEditingAccount(account);
    setIsEditOpen(true);
  };

  const handleDeleteRequest = (account: BankAccount) => {
    setAccountToDelete(account);
    setIsDeleteOpen(true);
  };

  const handleDeleteAccount = () => {
    if (!accountToDelete || deleteMutation.isPending) return;
    deleteMutation.mutate({ id: accountToDelete.id });
  };

  const editInitialValues: AccountFormValues = useMemo(
    () =>
      editingAccount
        ? {
            name: editingAccount.name,
            type: editingAccount.type as AccountFormValues["type"],
            // Convert decimal to cents for form (backend returns string decimal)
            initialBalance: Math.round(
              parseInitialBalance(editingAccount.initial_balance) * 100,
            ),
            currency: editingAccount.currency as AccountFormValues["currency"],
            color: editingAccount.color ?? defaultFormValues.color,
          }
        : defaultFormValues,
    [editingAccount],
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">
            Bank Accounts
          </h2>
          <p className="text-muted-foreground text-sm">
            Manage your bank accounts and balances.
          </p>
        </div>
        <Button className="gap-2" onClick={handleOpenCreate}>
          <IconPlus className="size-4" />
          Add New Account
        </Button>
      </header>

      {/* Statistics Cards */}
      {!isLoading && accounts.length > 0 && (
        <StatisticsCards
          totalBalance={stats.totalBalance}
          activeAccounts={stats.activeAccounts}
          averageBalance={stats.averageBalance}
          totalAccounts={stats.totalAccounts}
        />
      )}

      {/* Main Content: Cards List and Details Panel */}
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Left Panel: Your Accounts */}
        <AccountsList
          accounts={accounts}
          selectedAccountId={selectedAccount?.id ?? null}
          isLoading={isLoading}
          onSelectAccount={setSelectedAccount}
          onEditAccount={handleEditAccount}
          onDeleteAccount={handleDeleteRequest}
          onCreateAccount={handleOpenCreate}
        />

        {/* Right Panel: Account Details */}
        <div className="lg:sticky lg:top-6 lg:h-fit">
          <AccountDetailsPanel
            account={selectedAccount}
            onEdit={() => {
              if (selectedAccount) {
                handleEditAccount(selectedAccount);
              }
            }}
          />
        </div>
      </div>

      <AccountFormDialog
        mode="create"
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={async (values) => {
          try {
            // Convert cents to decimal for backend
            await createMutation.mutateAsync({
              ...values,
              initialBalance: values.initialBalance / 100,
            });
          } catch {
            // handled by onError
          }
        }}
        isLoading={createMutation.isPending}
        initialValues={defaultFormValues}
      />

      <AccountFormDialog
        mode="edit"
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setEditingAccount(null);
          }
        }}
        onSubmit={async (values) => {
          if (!editingAccount) return;
          try {
            // Convert cents to decimal for backend
            await updateMutation.mutateAsync({
              id: editingAccount.id,
              ...values,
              initialBalance: values.initialBalance / 100,
            });
          } catch {
            // handled by onError
          }
        }}
        isLoading={updateMutation.isPending}
        initialValues={editInitialValues}
      />

      <DeleteAccountDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) {
            setAccountToDelete(null);
          }
        }}
        account={accountToDelete}
        onConfirm={handleDeleteAccount}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
