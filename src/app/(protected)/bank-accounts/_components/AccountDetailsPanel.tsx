"use client";

import {
  IconBuilding,
  IconCopy,
  IconCreditCard,
  IconDownload,
  IconEye,
  IconSettings,
  IconWallet,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { GlowCard } from "@/components/gloweffect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/helpers/formatCurrency";
import { formatDate } from "@/helpers/formatDate";
import { accountTypeLabels } from "./constants";
import type { AccountFormValues, BankAccount } from "./types";
import { formatAccountNumber, parseInitialBalance } from "./utils";

type AccountDetailsPanelProps = {
  account: BankAccount | null;
  onEdit: () => void;
};

export function AccountDetailsPanel({
  account,
  onEdit,
}: AccountDetailsPanelProps) {
  if (!account) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Select an account to view details
          </p>
        </CardContent>
      </Card>
    );
  }

  const balance = parseInitialBalance(account.initial_balance);
  const accountNumber = formatAccountNumber(account.id);

  const handleCopyAccountNumber = () => {
    navigator.clipboard.writeText(account.id);
    toast.success("Account ID copied to clipboard");
  };

  return (
    <div className="space-y-6">
      {/* Account Details */}
      <GlowCard title="Account Details" description="View your account details">
        <div className="space-y-6">
          <div>
            <p className="text-2xl font-semibold">
              {formatCurrency(
                balance,
                account.currency as AccountFormValues["currency"],
              )}
            </p>
            <p className="text-sm text-muted-foreground">Current Balance</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Account Type
              </span>
              <span className="font-medium">
                {accountTypeLabels[account.type as AccountFormValues["type"]] ??
                  account.type}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Account Name
              </span>
              <span className="font-medium">{account.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Account Number
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium">{accountNumber}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleCopyAccountNumber}
                >
                  <IconCopy className="size-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Currency</span>
              <span className="font-medium">{account.currency}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant="success">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Created At</span>
              <span className="font-medium">
                {formatDate(account.created_at)}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onEdit}>
              <IconEye className="size-4" />
              Edit account
            </Button>
          </div>
        </div>
      </GlowCard>

      {/* Quick Actions */}
      {/* <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Quick Actions</CardTitle>
            <IconSettings className="size-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full justify-start">
            <IconWallet className="size-4" />
            Set as Default
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <IconBuilding className="size-4" />
            Update Details
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <IconDownload className="size-4" />
            Download Statement
          </Button>
        </CardContent>
      </Card> */}
    </div>
  );
}
