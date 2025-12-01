"use client";

import {
  IconCreditCard,
  IconDots,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/helpers/formatCurrency";
import { cn, getGradientFromColor } from "@/lib/utils";
import type { CreditCard } from "./types";

type CreditCardCardProps = {
  card: CreditCard;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function CreditCardCard({
  card,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: CreditCardCardProps) {
  const limit = Number(card.credit_limit);
  const available = Number(card.available_limit);
  const used = limit - available;
  const usagePercent = limit > 0 ? (used / limit) * 100 : 0;
  // Generate a gradient based on a hash of the card name or brand
  const gradient = getGradientFromColor(card.name);

  return (
    <button
      type="button"
      className={cn(
        "group relative w-full cursor-pointer rounded-lg border-2 transition-all text-left bg-transparent p-0",
        isSelected
          ? "border-primary shadow-lg"
          : "border-border hover:border-primary/50",
      )}
      onClick={onSelect}
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
                <IconCreditCard className="size-5" />
              </div>
              <div className="text-xs font-semibold uppercase">
                {card.brand || "CARD"}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-lg font-mono font-semibold truncate">
                •••• •••• •••• {card.name.slice(0, 4).toUpperCase()}
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-medium">TITULAR</div>
                <div className="uppercase truncate">{card.name}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Details */}
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold truncate">{card.name}</span>
                <Badge variant="secondary" className="text-xs">
                  Crédito
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Vencimento: Dia {card.due_day ?? "-"}
              </p>
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
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  variant="destructive"
                >
                  <IconTrash className="size-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-3 text-sm mt-auto">
            <div className="flex justify-between items-end">
              <div>
                <div className="text-xs text-muted-foreground">Disponível</div>
                <div className="font-semibold text-emerald-600">
                  {formatCurrency(
                    available,
                    card.currency as "BRL" | "USD" | "EUR",
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Utilizado</div>
                <div className="font-medium">
                  {formatCurrency(used, card.currency as "BRL" | "USD" | "EUR")}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uso do limite</span>
                <span>{Math.round(usagePercent)}%</span>
              </div>
              <Progress value={usagePercent} className="h-2" />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
