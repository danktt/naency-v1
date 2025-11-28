"use client";

import { IconCopy, IconEye } from "@tabler/icons-react";
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
          <CardTitle>Detalhes da Conta</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Selecione uma conta para ver os detalhes
          </p>
        </CardContent>
      </Card>
    );
  }

  const balance =
    account.current_balance ?? parseInitialBalance(account.initial_balance);
  const accountNumber = formatAccountNumber(account.id);

  const handleCopyAccountNumber = () => {
    navigator.clipboard.writeText(account.id);
    toast.success("ID da conta copiado para a área de transferência");
  };

  return (
    <div className="space-y-6">
      {/* Account Details */}
      <GlowCard
        title="Detalhes da Conta"
        description="Veja os detalhes da sua conta"
      >
        <div className="space-y-6">
          <div>
            <p className="text-2xl font-semibold">
              {formatCurrency(
                balance,
                account.currency as AccountFormValues["currency"],
              )}
            </p>
            <p className="text-sm text-muted-foreground">Saldo Atual</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Tipo da Conta
              </span>
              <span className="font-medium">
                {accountTypeLabels[account.type as AccountFormValues["type"]] ??
                  account.type}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Nome da Conta
              </span>
              <span className="font-medium">{account.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Número da Conta
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
              <span className="text-sm text-muted-foreground">Moeda</span>
              <span className="font-medium">{account.currency}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant="success">Ativa</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Criada em</span>
              <span className="font-medium">
                {formatDate(account.created_at)}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onEdit}>
              <IconEye className="size-4 mr-2" />
              Editar conta
            </Button>
          </div>
        </div>
      </GlowCard>
    </div>
  );
}
