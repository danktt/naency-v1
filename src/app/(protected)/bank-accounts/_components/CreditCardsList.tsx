"use client";

import { IconCreditCard, IconPlus } from "@tabler/icons-react";
import { GlowCard } from "@/components/gloweffect";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCardCard } from "./CreditCardCard";
import type { CreditCard } from "./types";

type CreditCardsListProps = {
  cards: CreditCard[];
  isLoading: boolean;
  onEditCard: (card: CreditCard) => void;
  onDeleteCard: (card: CreditCard) => void;
  onCreateCard: () => void;
};

export function CreditCardsList({
  cards,
  isLoading,
  onEditCard,
  onDeleteCard,
  onCreateCard,
}: CreditCardsListProps) {
  return (
    <GlowCard
      title="Credit Cards"
      description="Manage your credit cards and limits."
      hasAction={
        <Button
          className="w-full gap-2"
          onClick={onCreateCard}
          variant="outline"
        >
          <IconPlus className="size-4" />
          Add New Card
        </Button>
      }
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton key={index} className="h-32 w-full" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="py-10 text-center">
            <IconCreditCard className="mx-auto size-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              No credit cards yet.
            </p>
            <Button
              className="mt-4 gap-2"
              onClick={onCreateCard}
              variant="outline"
            >
              <IconPlus className="size-4" />
              Add New Card
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {cards.map((card) => (
              <CreditCardCard
                key={card.id}
                card={card}
                onEdit={() => onEditCard(card)}
                onDelete={() => onDeleteCard(card)}
              />
            ))}
          </div>
        )}
      </div>
    </GlowCard>
  );
}


