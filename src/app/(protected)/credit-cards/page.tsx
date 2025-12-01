"use client";

import { CreditCardExpenseForm } from "@/components/forms/CreditCardExpenseForm";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { IconPlus } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CreditCardDetailsPanel } from "./_components/CreditCardDetailsPanel";
import { CreditCardFormDialog } from "./_components/CreditCardFormDialog";
import { CreditCardsList } from "./_components/CreditCardsList";
import { CreditCardsStatistics } from "./_components/CreditCardsStatistics";
import { DeleteCreditCardDialog } from "./_components/DeleteCreditCardDialog";
import type { CreditCard, CreditCardFormValues } from "./_components/types";

export default function CreditCardsPage() {
  const utils = trpc.useUtils();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [deletingCard, setDeletingCard] = useState<CreditCard | null>(null);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);

  const creditCardsQuery = trpc.creditCards.list.useQuery();
  const cards = (creditCardsQuery.data as unknown as CreditCard[]) ?? [];

  // Auto-select first card
  useEffect(() => {
    if (!selectedCard && cards.length > 0) {
      setSelectedCard(cards[0] ?? null);
    }
  }, [cards, selectedCard]);

  // === STATISTICS ===
  const stats = useMemo(() => {
    if (!cards.length) {
      return {
        totalLimit: 0,
        totalUsed: 0,
        totalAvailable: 0,
      };
    }

    return cards.reduce(
      (acc, card) => {
        const limit = Number(card.credit_limit);
        const available = Number(card.available_limit);
        const used = limit - available;

        return {
          totalLimit: acc.totalLimit + limit,
          totalUsed: acc.totalUsed + used,
          totalAvailable: acc.totalAvailable + available,
        };
      },
      { totalLimit: 0, totalUsed: 0, totalAvailable: 0 },
    );
  }, [cards]);

  const createMutation = trpc.creditCards.create.useMutation({
    onSuccess: () => {
      toast.success("Cartão criado com sucesso!");
      setIsCreateDialogOpen(false);
      utils.creditCards.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.creditCards.update.useMutation({
    onSuccess: () => {
      toast.success("Cartão atualizado com sucesso!");
      setEditingCard(null);
      utils.creditCards.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.creditCards.delete.useMutation({
    onSuccess: () => {
      toast.success("Cartão excluído com sucesso!");
      setDeletingCard(null);
      if (selectedCard?.id === deletingCard?.id) {
        setSelectedCard(null);
      }
      utils.creditCards.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = async (values: CreditCardFormValues) => {
    if (editingCard) {
      await updateMutation.mutateAsync({
        ...values,
        id: editingCard.id,
      });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const handleConfirmDelete = async () => {
    if (deletingCard) {
      await deleteMutation.mutateAsync({ id: deletingCard.id });
    }
  };

  const handleEditCard = (card: CreditCard) => {
    setEditingCard(card);
  };

  const handleDeleteRequest = (card: CreditCard) => {
    setDeletingCard(card);
  };

  const initialFormValues: CreditCardFormValues = editingCard
    ? {
        id: editingCard.id,
        name: editingCard.name,
        brand: editingCard.brand ?? undefined,
        creditLimit: Number(editingCard.credit_limit),
        closingDay: editingCard.closing_day,
        dueDay: editingCard.due_day,
        currency: (editingCard.currency as "BRL" | "USD") ?? "BRL",
      }
    : {
        name: "",
        brand: "",
        creditLimit: 0,
        closingDay: undefined,
        dueDay: undefined,
        currency: "BRL",
      };

  return (
    <div className="container mx-auto space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">
            Cartões de Crédito
          </h2>
          <p className="text-muted-foreground text-sm">
            Gerencie seus cartões, limites e datas de vencimento.
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
            <IconPlus className="size-4" />
            Novo Cartão
          </Button>
          <CreditCardExpenseForm
            open={isExpenseFormOpen}
            onOpenChange={setIsExpenseFormOpen}
            defaultCreditCardId={selectedCard?.id ?? null}
          />
        </div>
      </header>

      {/* Statistics */}
      {!creditCardsQuery.isLoading && cards.length > 0 && (
        <CreditCardsStatistics
          totalLimit={stats.totalLimit}
          totalUsed={stats.totalUsed}
          totalAvailable={stats.totalAvailable}
        />
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Left Panel: Cards List */}
        <div className="space-y-8">
          <CreditCardsList
            cards={cards}
            selectedCardId={selectedCard?.id ?? null}
            isLoading={creditCardsQuery.isLoading}
            onCreateCard={() => setIsCreateDialogOpen(true)}
            onSelectCard={setSelectedCard}
            onEditCard={handleEditCard}
            onDeleteCard={handleDeleteRequest}
          />
        </div>

        {/* Right Panel: Card Details */}
        <div className="lg:sticky lg:top-6 lg:h-fit">
          <CreditCardDetailsPanel
            card={selectedCard}
            onEdit={() => {
              if (selectedCard) {
                handleEditCard(selectedCard);
              }
            }}
          />
        </div>
      </div>

      <CreditCardFormDialog
        mode={editingCard ? "edit" : "create"}
        open={isCreateDialogOpen || !!editingCard}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingCard(null);
          }
        }}
        initialValues={initialFormValues}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteCreditCardDialog
        open={!!deletingCard}
        onOpenChange={(open) => !open && setDeletingCard(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
