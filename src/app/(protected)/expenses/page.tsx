"use client";

import {
  IconChartBar,
  IconCurrencyDollar,
  IconWallet,
} from "@tabler/icons-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { ExpensesForm } from "@/components/forms/expensesForm";
import { GridItem } from "@/components/gloweffect";
import { formatCurrency } from "@/helpers/formatCurrency";
import { trpc } from "@/lib/trpc/client";
import { useDateStore } from "@/stores/useDateStore";

import { ExpensesTable } from "./_components/ExpensesTable";

type MetricKey = "totalExpenses" | "totalIncomes" | "netBalance";

const metricConfigs: Array<{
  key: MetricKey;
  titleKey: string;
  changeKey: string;
  icon: typeof IconCurrencyDollar;
}> = [
  {
    key: "totalExpenses",
    titleKey: "metrics.totalExpenses.title",
    changeKey: "metrics.totalExpenses.change",
    icon: IconWallet,
  },
  {
    key: "totalIncomes",
    titleKey: "metrics.totalIncomes.title",
    changeKey: "metrics.totalIncomes.change",
    icon: IconCurrencyDollar,
  },
  {
    key: "netBalance",
    titleKey: "metrics.netBalance.title",
    changeKey: "metrics.netBalance.change",
    icon: IconChartBar,
  },
];

export default function ExpensesPage() {
  const { t, i18n } = useTranslation("expenses");
  const [isMounted, setIsMounted] = React.useState(false);
  const dateRange = useDateStore((state) => state.dateRange);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const fallbackLng =
    (Array.isArray(i18n.options?.fallbackLng) && i18n.options.fallbackLng[0]) ||
    (typeof i18n.options?.fallbackLng === "string"
      ? i18n.options.fallbackLng
      : "en");

  const fallbackT = React.useMemo(
    () => i18n.getFixedT(fallbackLng, "expenses"),
    [i18n, fallbackLng],
  );

  const translate = isMounted ? t : fallbackT;

  const metricsQueryInput = React.useMemo(
    () => ({
      dateRange: {
        from: dateRange.from,
        to: dateRange.to,
      },
    }),
    [dateRange.from, dateRange.to],
  );

  const {
    data: metricsData,
    isLoading: isMetricsLoading,
    isError: isMetricsError,
  } = trpc.transactions.metrics.useQuery(metricsQueryInput);

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

  const getValue = React.useCallback(
    (key: MetricKey) => {
      if (isMetricsLoading && !metricsData) {
        return translate("metrics.loadingValue");
      }

      if (isMetricsError) {
        return translate("metrics.errorValue");
      }

      return formatCurrency(totalsByKey[key]);
    },
    [isMetricsError, isMetricsLoading, metricsData, totalsByKey, translate],
  );

  const getDescription = React.useCallback(
    (changeKey: string, key: MetricKey) => {
      if (isMetricsLoading && !metricsData) {
        return translate("metrics.loadingDescription");
      }

      if (isMetricsError) {
        return translate("metrics.errorDescription");
      }

      return translate(changeKey, {
        value: formatCurrency(totalsByKey[key]),
      });
    },
    [isMetricsError, isMetricsLoading, metricsData, totalsByKey, translate],
  );

  return (
    <div className="space-y-8">
      <section className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            {translate("header.title")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {translate("header.subtitle")}
          </p>
        </div>
        <div>
          <ExpensesForm />
        </div>
      </section>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metricConfigs.map((metric) => {
          const Icon = metric.icon;
          return (
            <GridItem
              key={metric.titleKey}
              icon={
                <Icon
                  className="size-5 text-black dark:text-neutral-400"
                  stroke={1.5}
                />
              }
              title={translate(metric.titleKey)}
              value={getValue(metric.key)}
              description={getDescription(metric.changeKey, metric.key)}
            />
          );
        })}
      </ul>
      <section>
        <ExpensesTable />
      </section>
    </div>
  );
}
