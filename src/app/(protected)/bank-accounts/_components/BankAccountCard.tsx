"use client";

import {
  IconDots,
  IconPencil,
  IconTrash,
  IconWallet,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/helpers/formatCurrency";
import { formatDate } from "@/helpers/formatDate";
import { cn } from "@/lib/utils";
import { accountTypeLabels } from "./constants";
import type { AccountFormValues, BankAccount } from "./types";
import {
  formatAccountNumber,
  getGradientFromColor,
  parseInitialBalance,
} from "./utils";

type BankAccountCardProps = {
  account: BankAccount;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function BankAccountCard({
  account,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: BankAccountCardProps) {
  const balance =
    account.current_balance ?? parseInitialBalance(account.initial_balance);
  const gradient = getGradientFromColor(account.color ?? "#6366F1");
  const accountNumber = formatAccountNumber(account.id);

  return (
    // biome-ignore lint/a11y/useSemanticElements: preventing nested button error
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "group relative w-full cursor-pointer rounded-lg border-2 transition-all text-left bg-transparent p-0",
        isSelected
          ? "border-primary shadow-lg"
          : "border-border hover:border-primary/50",
      )}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="flex gap-4 p-4">
        {/* Visual Card */}
        <div
          className="relative h-32 w-56 shrink-0 overflow-hidden rounded-lg p-4 text-white shadow-lg"
          style={{ background: gradient }}
        >
          <div className="flex h-full flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex size-8 items-center justify-center rounded-full bg-white/20">
                <IconWallet className="size-5" />
              </div>
              <div className="text-xs font-semibold uppercase">
                {account.type}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-lg font-mono font-semibold">
                {accountNumber}
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-medium">ACCOUNT HOLDER</div>
                <div className="uppercase">{account.name}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Details */}
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {accountTypeLabels[
                    account.type as AccountFormValues["type"]
                  ] ?? account.type}
                </span>
                <Badge variant="success" className="text-xs">
                  Active
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{account.name}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                asChild
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <IconDots className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <IconPencil className="size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  variant="destructive"
                >
                  <IconTrash className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="space-y-1 text-sm">
            <div>
              <span className="font-semibold">Balance </span>
              <span className="text-muted-foreground">
                {formatCurrency(
                  balance,
                  account.currency as AccountFormValues["currency"],
                )}
              </span>
            </div>
            <div>
              <span className="font-semibold">Currency </span>
              <span className="text-muted-foreground">{account.currency}</span>
            </div>
            <div>
              <span className="font-semibold">Account Number </span>
              <span className="font-mono text-muted-foreground">
                {accountNumber}
              </span>
            </div>
            <div>
              <span className="font-semibold">Created </span>
              <span className="text-muted-foreground">
                {formatDate(account.created_at)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
