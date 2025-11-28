"use client";

import { IconPlus } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { AccountDetailsPanel } from "./_components/AccountDetailsPanel";
import { AccountFormDialog } from "./_components/AccountFormDialog";
import { AccountsList } from "./_components/AccountsList";
import { CreditCardFormDialog } from "./_components/CreditCardFormDialog";
import { CreditCardsList } from "./_components/CreditCardsList";
import {
  defaultCreditCardFormValues,
  defaultFormValues,
} from "./_components/constants";
import { DeleteAccountDialog } from "./_components/DeleteAccountDialog";
import { DeleteCreditCardDialog } from "./_components/DeleteCreditCardDialog";
import { StatisticsCards } from "./_components/StatisticsCards";
import type {
  AccountFormValues,
  BankAccount,
  CreditCard,
  CreditCardFormValues,
} from "./_components/types";
import { parseInitialBalance } from "./_components/utils";

export default function BankAccountsPage() {
  const utils = trpc.useUtils();

  // === BANK ACCOUNTS STATE ===
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

  // === CREDIT CARDS STATE ===
  const [isCreateCardOpen, setIsCreateCardOpen] = useState(false);
  const [isEditCardOpen, setIsEditCardOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [isDeleteCardOpen, setIsDeleteCardOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<CreditCard | null>(null);

  // === QUERIES ===
  const bankAccountsQuery = trpc.bankAccounts.list.useQuery();
  const creditCardsQuery = trpc.creditCards.list.useQuery();
  const accounts = bankAccountsQuery.data ?? [];
  const cards = creditCardsQuery.data ?? [];

  // === MUTATIONS (Bank Accounts) ===
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

  // === MUTATIONS (Credit Cards) ===
  const createCardMutation = trpc.creditCards.create.useMutation({
    onSuccess: async () => {
      toast.success("Credit card added successfully.");
      setIsCreateCardOpen(false);
      await utils.creditCards.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message ?? "Unable to add credit card.");
    },
  });

  const updateCardMutation = trpc.creditCards.update.useMutation({
    onSuccess: async () => {
      toast.success("Credit card updated.");
      setIsEditCardOpen(false);
      setEditingCard(null);
      await utils.creditCards.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message ?? "Unable to update credit card.");
    },
  });

  const deleteCardMutation = trpc.creditCards.delete.useMutation({
    onSuccess: async () => {
      toast.success("Credit card deleted.");
      setIsDeleteCardOpen(false);
      setCardToDelete(null);
      await utils.creditCards.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message ?? "Unable to delete credit card.");
    },
  });

  // === STATISTICS ===
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
      return (
        sum +
        (account.current_balance ??
          parseInitialBalance(account.initial_balance))
      );
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
  const isCardsLoading = creditCardsQuery.isLoading;

  // === HANDLERS (Accounts) ===
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

  // === HANDLERS (Cards) ===
  const handleOpenCreateCard = () => {
    setIsCreateCardOpen(true);
  };

  const handleEditCard = (card: CreditCard) => {
    setEditingCard(card);
    setIsEditCardOpen(true);
  };

  const handleDeleteCardRequest = (card: CreditCard) => {
    setCardToDelete(card);
    setIsDeleteCardOpen(true);
  };

  const handleDeleteCard = () => {
    if (!cardToDelete || deleteCardMutation.isPending) return;
    deleteCardMutation.mutate({ id: cardToDelete.id });
  };

  // === FORM INITIAL VALUES ===
  const editInitialValues: AccountFormValues = useMemo(
    () =>
      editingAccount
        ? {
            name: editingAccount.name,
            type: editingAccount.type as AccountFormValues["type"],
            initialBalance: Math.round(
              parseInitialBalance(editingAccount.initial_balance) * 100,
            ),
            currency: editingAccount.currency as AccountFormValues["currency"],
            color: editingAccount.color ?? defaultFormValues.color,
          }
        : defaultFormValues,
    [editingAccount],
  );

  const editCardInitialValues: CreditCardFormValues = useMemo(
    () =>
      editingCard
        ? {
            name: editingCard.name,
            brand: editingCard.brand ?? undefined,
            creditLimit: Math.round(Number(editingCard.credit_limit) * 100),
            currency: editingCard.currency as CreditCardFormValues["currency"],
            closingDay: editingCard.closing_day ?? undefined,
            dueDay: editingCard.due_day ?? undefined,
          }
        : defaultCreditCardFormValues,
    [editingCard],
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">
            Accounts & Cards
          </h2>
          <p className="text-muted-foreground text-sm">
            Manage your bank accounts and credit cards.
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="gap-2" onClick={handleOpenCreate}>
            <IconPlus className="size-4" />
            Add Account
          </Button>
          <Button
            className="gap-2"
            variant="secondary"
            onClick={handleOpenCreateCard}
          >
            <IconPlus className="size-4" />
            Add Card
          </Button>
        </div>
      </header>

      {/* Statistics Cards (Only for Bank Accounts for now) */}
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
        {/* Left Panel: Your Accounts & Cards */}
        <div className="space-y-8">
          <AccountsList
            accounts={accounts}
            selectedAccountId={selectedAccount?.id ?? null}
            isLoading={isLoading}
            onSelectAccount={setSelectedAccount}
            onEditAccount={handleEditAccount}
            onDeleteAccount={handleDeleteRequest}
            onCreateAccount={handleOpenCreate}
          />

          <CreditCardsList
            cards={cards}
            isLoading={isCardsLoading}
            onEditCard={handleEditCard}
            onDeleteCard={handleDeleteCardRequest}
            onCreateCard={handleOpenCreateCard}
          />
        </div>

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

      {/* === BANK ACCOUNT DIALOGS === */}
      <AccountFormDialog
        mode="create"
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={async (values) => {
          try {
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

      {/* === CREDIT CARD DIALOGS === */}
      <CreditCardFormDialog
        mode="create"
        open={isCreateCardOpen}
        onOpenChange={setIsCreateCardOpen}
        onSubmit={async (values) => {
          try {
            await createCardMutation.mutateAsync({
              ...values,
              creditLimit: values.creditLimit / 100,
            });
          } catch {
            // handled by onError
          }
        }}
        isLoading={createCardMutation.isPending}
        initialValues={defaultCreditCardFormValues}
      />

      <CreditCardFormDialog
        mode="edit"
        open={isEditCardOpen}
        onOpenChange={(open) => {
          setIsEditCardOpen(open);
          if (!open) {
            setEditingCard(null);
          }
        }}
        onSubmit={async (values) => {
          if (!editingCard) return;
          try {
            await updateCardMutation.mutateAsync({
              id: editingCard.id,
              ...values,
              creditLimit: values.creditLimit / 100,
            });
          } catch {
            // handled by onError
          }
        }}
        isLoading={updateCardMutation.isPending}
        initialValues={editCardInitialValues}
      />

      <DeleteCreditCardDialog
        open={isDeleteCardOpen}
        onOpenChange={(open) => {
          setIsDeleteCardOpen(open);
          if (!open) {
            setCardToDelete(null);
          }
        }}
        card={cardToDelete}
        onConfirm={handleDeleteCard}
        isLoading={deleteCardMutation.isPending}
      />
    </div>
  );
}
