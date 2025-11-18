"use client";

import {
  IconCreditCard,
  IconShield,
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
        title="Total Balance"
        value={formatCurrency(totalBalance, "BRL")}
        description="Across all accounts"
        iconContainerClassName="bg-blue-500/10 text-blue-600 dark:text-blue-400"
      />

      <GridItem
        icon={<IconCreditCard className="size-5" />}
        title="Active Accounts"
        value={`${activeAccounts}/${totalAccounts}`}
        description="All accounts active"
        iconContainerClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      />

      <GridItem
        icon={<IconTrendingUp className="size-5" />}
        title="Average Balance"
        value={formatCurrency(averageBalance, "BRL")}
        description="Per account"
        iconContainerClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
      />
    </section>
  );
}
