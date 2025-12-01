"use client";

import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconChartBar,
} from "@tabler/icons-react";
import * as React from "react";

import { ExpensesForm } from "@/components/forms/expensesForm";
import { GridItem } from "@/components/gloweffect";
import { formatCurrency } from "@/helpers/formatCurrency";
import { trpc } from "@/lib/trpc/client";
import { useDateStore } from "@/stores/useDateStore";

import { ExpensesTable } from "./_components/ExpensesTable";

type MetricKey = "totalExpenses" | "totalIncomes" | "netBalance";

const metricConfigs: Array<{
  key: MetricKey;
  title: string;
  changeFormat: string;
  icon: React.ElementType;
  iconContainerClassName: string;
}> = [
  {
    key: "totalExpenses",
    title: "Despesas totais",
    changeFormat: "{{value}} gastos no período selecionado",
    icon: IconArrowDownRight,
    iconContainerClassName: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  {
    key: "totalIncomes",
    title: "Receitas totais",
    changeFormat: "{{value}} recebidos no período selecionado",
    icon: IconArrowUpRight,
    iconContainerClassName:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "netBalance",
    title: "Saldo líquido",
    changeFormat: "Saldo líquido de {{value}} no período selecionado",
    icon: IconChartBar,
    iconContainerClassName: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
];

export default function ExpensesPage() {
  const { from, to } = useDateStore((state) => state.dateRange);

  const { data: metricsData, isLoading: isMetricsLoading } =
    trpc.transactions.metrics.useQuery({
      dateRange: { from, to },
      excludeCreditCard: true,
    });

  const totalsByKey: Record<MetricKey, number> = React.useMemo(
    () => ({
      totalExpenses: metricsData?.totalExpenses ?? 0,
      totalIncomes: metricsData?.totalIncomes ?? 0,
      netBalance: metricsData?.netBalance ?? 0,
    }),
    [
      metricsData?.netBalance,
      metricsData?.totalExpenses,
      metricsData?.totalIncomes,
    ],
  );

  return (
    <div className="space-y-8">
      <section className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">Despesas</h2>
          <p className="text-muted-foreground text-sm">
            Gerencie suas despesas.
          </p>
        </div>
        <div>
          <ExpensesForm excludeCreditCard />
        </div>
      </section>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metricConfigs.map((metric) => {
          const Icon = metric.icon;
          const value = formatCurrency(totalsByKey[metric.key]);
          const description = metric.changeFormat.replace("{{value}}", value);
          return (
            <GridItem
              key={metric.key}
              icon={<Icon className="size-5 " stroke={1.5} />}
              iconContainerClassName={metric.iconContainerClassName}
              title={metric.title}
              isLoading={isMetricsLoading}
              value={value}
              description={description}
            />
          );
        })}
      </ul>
      <section className="grid grid-cols-1 ">
        <ExpensesTable />
      </section>
    </div>
  );
}
