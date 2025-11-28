"use client";

import {
  IconCreditCard,
  IconTrendingUp,
  IconWallet,
} from "@tabler/icons-react";
import { GridItem } from "@/components/gloweffect";
import { formatCurrency } from "@/helpers/formatCurrency";

type StatisticsCardsProps = {
  totalBalance: number;
  activeAccounts: number;
  averageBalance: number;
  totalAccounts: number;
};

export function StatisticsCards({
  totalBalance,
  activeAccounts,
  averageBalance,
  totalAccounts,
}: StatisticsCardsProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <GridItem
        icon={<IconWallet className="size-5" />}
        title="Saldo Total"
        value={formatCurrency(totalBalance, "BRL")}
        description="Em todas as contas"
        iconContainerClassName="bg-blue-500/10 text-blue-600 dark:text-blue-400"
      />

      <GridItem
        icon={<IconCreditCard className="size-5" />}
        title="Contas Ativas"
        value={`${activeAccounts}/${totalAccounts}`}
        description="Todas as contas ativas"
        iconContainerClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      />

      <GridItem
        icon={<IconTrendingUp className="size-5" />}
        title="Saldo Médio"
        value={formatCurrency(averageBalance, "BRL")}
        description="Por conta"
        iconContainerClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
      />
    </section>
  );
}
