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
import { cn } from "@/lib/utils";
import { type AccountFormValues } from "./constants";
import type { CreditCard } from "./types";
import { getGradientFromColor } from "./utils";

type CreditCardCardProps = {
  card: CreditCard;
  onEdit: () => void;
  onDelete: () => void;
};

export function CreditCardCard({ card, onEdit, onDelete }: CreditCardCardProps) {
  // We use a default color for cards or generate one
  const gradient = getGradientFromColor("#333"); 
  const limit = Number(card.credit_limit);
  const available = Number(card.available_limit);
  const used = limit - available;
  const usagePercent = limit > 0 ? (used / limit) * 100 : 0;

  return (
    <div className="group relative w-full rounded-lg border-2 border-border bg-transparent p-0 hover:border-primary/50 transition-all">
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
              {card.brand && (
                <div className="text-xs font-semibold uppercase opacity-80">
                  {card.brand}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="text-lg font-mono font-semibold truncate">
                •••• •••• •••• ••••
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-medium">CARD HOLDER</div>
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
                <span className="font-semibold">{card.name}</span>
                <Badge variant="secondary" className="text-xs">
                  Credit
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                 Closing: Day {card.closing_day ?? "-"} | Due: Day {card.due_day ?? "-"}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <IconDots className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <IconPencil className="size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} variant="destructive">
                  <IconTrash className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-3 text-sm mt-auto">
            <div className="flex justify-between items-end">
                <div>
                    <div className="text-xs text-muted-foreground">Available Limit</div>
                    <div className="font-semibold text-green-600">
                        {formatCurrency(available, card.currency as "BRL" | "USD")}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xs text-muted-foreground">Used</div>
                    <div className="font-medium">
                        {formatCurrency(used, card.currency as "BRL" | "USD")}
                    </div>
                </div>
            </div>
            
            <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Usage</span>
                    <span>{Math.round(usagePercent)}%</span>
                </div>
                <Progress value={usagePercent} className="h-2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


