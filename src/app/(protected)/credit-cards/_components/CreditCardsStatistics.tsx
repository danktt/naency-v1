"use client";

import {
  IconChartPie,
  IconCreditCard,
  IconTrendingUp,
} from "@tabler/icons-react";
import { GridItem } from "@/components/gloweffect";
import { formatCurrency } from "@/helpers/formatCurrency";

type CreditCardsStatisticsProps = {
  totalLimit: number;
  totalUsed: number;
  totalAvailable: number;
};

export function CreditCardsStatistics({
  totalLimit,
  totalUsed,
  totalAvailable,
}: CreditCardsStatisticsProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <GridItem
        icon={<IconCreditCard className="size-5" />}
        title="Limite Total"
        value={formatCurrency(totalLimit, "BRL")}
        description="Soma de todos os limites"
        iconContainerClassName="bg-blue-500/10 text-blue-600 dark:text-blue-400"
      />

      <GridItem
        icon={<IconChartPie className="size-5" />}
        title="Limite Utilizado"
        value={formatCurrency(totalUsed, "BRL")}
        description="Total em faturas abertas"
        iconContainerClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
      />

      <GridItem
        icon={<IconTrendingUp className="size-5" />}
        title="Limite Disponível"
        value={formatCurrency(totalAvailable, "BRL")}
        description="Para novas compras"
        iconContainerClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      />
    </section>
  );
}














