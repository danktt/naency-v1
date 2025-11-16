"use client";

import {
  IconChartBar,
  IconCurrencyDollar,
  IconWallet,
} from "@tabler/icons-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { IncomesForm } from "@/components/forms/incomesForm";
import { GridItem } from "@/components/gloweffect";
import { formatCurrency } from "@/helpers/formatCurrency";
import { trpc } from "@/lib/trpc/client";
import { useDateStore } from "@/stores/useDateStore";

import { IncomesTable } from "./_components/IncomesTable";

type MetricKey = "totalIncomes" | "totalExpenses" | "netBalance";

const metricConfigs: Array<{
  key: MetricKey;
  iconContainerClassName: string;
  titleKey: string;
  changeKey: string;
  icon: typeof IconCurrencyDollar;
}> = [
  {
    key: "totalIncomes",
    titleKey: "metrics.totalIncomes.title",
    changeKey: "metrics.totalIncomes.change",
    icon: IconCurrencyDollar,
    iconContainerClassName:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "totalExpenses",
    titleKey: "metrics.totalExpenses.title",
    changeKey: "metrics.totalExpenses.change",
    icon: IconWallet,
    iconContainerClassName: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  {
    key: "netBalance",
    titleKey: "metrics.netBalance.title",
    changeKey: "metrics.netBalance.change",
    icon: IconChartBar,
    iconContainerClassName: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
];

export default function IncomesPage() {
  const { t, i18n } = useTranslation("incomes");
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
    () => i18n.getFixedT(fallbackLng, "incomes"),
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
      totalIncomes: metricsData?.totalIncomes ?? 0,
      totalExpenses: metricsData?.totalExpenses ?? 0,
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
          <IncomesForm />
        </div>
      </section>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metricConfigs.map((metric) => {
          const Icon = metric.icon;
          return (
            <GridItem
              key={metric.titleKey}
              icon={<Icon className="size-5 " stroke={1.5} />}
              iconContainerClassName={metric.iconContainerClassName}
              title={translate(metric.titleKey)}
              value={getValue(metric.key)}
              description={getDescription(metric.changeKey, metric.key)}
            />
          );
        })}
      </ul>
      <section className="grid grid-cols-1 ">
        <IncomesTable />
      </section>
    </div>
  );
}
