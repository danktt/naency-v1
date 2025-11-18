"use client";

import { IconPlus, IconWallet } from "@tabler/icons-react";
import { GlowCard } from "@/components/gloweffect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BankAccountCard } from "./BankAccountCard";
import type { BankAccount } from "./types";

type AccountsListProps = {
  accounts: BankAccount[];
  selectedAccountId: string | null;
  isLoading: boolean;
  onSelectAccount: (account: BankAccount) => void;
  onEditAccount: (account: BankAccount) => void;
  onDeleteAccount: (account: BankAccount) => void;
  onCreateAccount: () => void;
};

export function AccountsList({
  accounts,
  selectedAccountId,
  isLoading,
  onSelectAccount,
  onEditAccount,
  onDeleteAccount,
  onCreateAccount,
}: AccountsListProps) {
  return (
    <GlowCard
      title="Your Accounts"
      description="Manage your bank accounts and balances."
      hasAction={
        <Button
          className="w-full gap-2"
          onClick={onCreateAccount}
          variant="outline"
        >
          <IconPlus className="size-4" />
          Add New Account
        </Button>
      }
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-32 w-full" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="py-10 text-center">
            <IconWallet className="mx-auto size-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              No bank accounts yet. Create your first account to get started.
            </p>
            <Button
              className="mt-4 gap-2"
              onClick={onCreateAccount}
              variant="outline"
            >
              <IconPlus className="size-4" />
              Add New Account
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => (
              <BankAccountCard
                key={account.id}
                account={account}
                isSelected={selectedAccountId === account.id}
                onSelect={() => onSelectAccount(account)}
                onEdit={() => onEditAccount(account)}
                onDelete={() => onDeleteAccount(account)}
              />
            ))}
          </div>
        )}
      </div>
    </GlowCard>
  );
}
