"use client";

import { IconEye } from "@tabler/icons-react";
import { CreditCardDetail } from "@/components/CreditCardDetail";
import { GlowCard } from "@/components/gloweffect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/helpers/formatCurrency";
import type { CreditCard } from "./types";

type CreditCardDetailsPanelProps = {
  card: CreditCard | null;
  onEdit: () => void;
};

export function CreditCardDetailsPanel({
  card,
  onEdit,
}: CreditCardDetailsPanelProps) {
  if (!card) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Cartão</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Selecione um cartão para ver os detalhes
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <GlowCard
        title="Detalhes do Cartão"
        description="Veja os detalhes e limites"
      >
        <div className="space-y-6">
          <CreditCardDetail
            name={card.name}
            brand={card.brand}
            creditLimit={Number(card.credit_limit)}
            availableLimit={Number(card.available_limit)}
            currency={card.currency as "BRL" | "USD" | "EUR"}
            closingDay={card.closing_day}
            dueDay={card.due_day}
            className="p-0"
          />

          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Nome</span>
              <span className="font-medium">{card.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Bandeira</span>
              <span className="font-medium">{card.brand || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Moeda</span>
              <span className="font-medium">{card.currency}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant="success">Ativo</Badge>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onEdit}>
              <IconEye className="size-4 mr-2" />
              Editar cartão
            </Button>
          </div>
        </div>
      </GlowCard>
    </div>
  );
}




