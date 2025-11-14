"use client";

import { Tab, Tabs } from "@heroui/tabs";
import {
  Icon12Hours,
  IconChartBar,
  IconCurrencyDollar,
  IconWallet,
} from "@tabler/icons-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { GridItem } from "@/components/gloweffect";
import { formatCurrency } from "@/helpers/formatCurrency";
import { trpc } from "@/lib/trpc/client";

type MetricKey =
  | "plannedTotal"
  | "realizedTotal"
  | "remainingTotal"
  | "coverage"
  | "overBudgetTotal";

type MetricConfig = {
  key: MetricKey;
  titleKey: string;
  changeKey: string;
  icon: typeof IconCurrencyDollar;
  format: "currency" | "percentage";
};

const metricConfigs: MetricConfig[] = [
  {
    key: "plannedTotal",
    titleKey: "metrics.plannedTotal.title",
    changeKey: "metrics.plannedTotal.change",
    icon: IconCurrencyDollar,
    format: "currency",
  },
  {
    key: "realizedTotal",
    titleKey: "metrics.realizedTotal.title",
    changeKey: "metrics.realizedTotal.change",
    icon: IconWallet,
    format: "currency",
  },
  {
    key: "remainingTotal",
    titleKey: "metrics.remainingTotal.title",
    changeKey: "metrics.remainingTotal.change",
    icon: IconChartBar,
    format: "currency",
  },
  {
    key: "coverage",
    titleKey: "metrics.coverage.title",
    changeKey: "metrics.coverage.change",
    icon: Icon12Hours,
    format: "percentage",
  },
  {
    key: "overBudgetTotal",
    titleKey: "metrics.overBudgetTotal.title",
    changeKey: "metrics.overBudgetTotal.change",
    icon: IconWallet,
    format: "currency",
  },
];

const formatPercentage = (value: number) =>
  `${new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)}%`;

export default function ProvisionsPage() {
  const { t, i18n } = useTranslation("provisions");
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const fallbackLng =
    (Array.isArray(i18n.options?.fallbackLng) && i18n.options.fallbackLng[0]) ||
    (typeof i18n.options?.fallbackLng === "string"
      ? i18n.options.fallbackLng
      : "en");

  const fallbackT = React.useMemo(
    () => i18n.getFixedT(fallbackLng, "provisions"),
    [i18n, fallbackLng],
  );

  const translate = isMounted ? t : fallbackT;

  const {
    data: metricsData,
    isLoading: isMetricsLoading,
    isError: isMetricsError,
  } = trpc.provisions.metrics.useQuery();

  const totalsByKey: Record<MetricKey, number> = React.useMemo(
    () => ({
      plannedTotal: metricsData?.plannedTotal ?? 0,
      realizedTotal: metricsData?.realizedTotal ?? 0,
      remainingTotal: metricsData?.remainingTotal ?? 0,
      coverage: metricsData?.coverage ?? 0,
      overBudgetTotal: metricsData?.overBudgetTotal ?? 0,
    }),
    [
      metricsData?.coverage,
      metricsData?.overBudgetTotal,
      metricsData?.plannedTotal,
      metricsData?.realizedTotal,
      metricsData?.remainingTotal,
    ],
  );

  const getFormattedValue = React.useCallback(
    (config: MetricConfig) => {
      if (isMetricsLoading && !metricsData) {
        return translate("metrics.loadingValue");
      }
      if (isMetricsError) {
        return translate("metrics.errorValue");
      }
      return config.format === "percentage"
        ? formatPercentage(totalsByKey[config.key])
        : formatCurrency(totalsByKey[config.key]);
    },
    [isMetricsError, isMetricsLoading, metricsData, totalsByKey, translate],
  );

  const getDescription = React.useCallback(
    (config: MetricConfig) => {
      if (isMetricsLoading && !metricsData) {
        return translate("metrics.loadingDescription");
      }
      if (isMetricsError) {
        return translate("metrics.errorDescription");
      }
      const formattedValue =
        config.format === "percentage"
          ? formatPercentage(totalsByKey[config.key])
          : formatCurrency(totalsByKey[config.key]);
      return translate(config.changeKey, { value: formattedValue });
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
        <div>{/* <IncomesForm /> */}</div>
      </section>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {metricConfigs.map((metric) => {
          const Icon = metric.icon;
          return (
            <GridItem
              key={metric.key}
              icon={
                <Icon
                  className="size-5 text-black dark:text-neutral-400"
                  stroke={1.5}
                />
              }
              title={translate(metric.titleKey)}
              value={getFormattedValue(metric)}
              description={getDescription(metric)}
            />
          );
        })}
      </ul>
      <section>
        <div>
          <Tabs aria-label="Tabs sizes">
            <Tab key="incomes" title={translate("metrics.tabs.incomes")} />
            <Tab key="expenses" title={translate("metrics.tabs.expenses")} />
          </Tabs>
        </div>
      </section>
    </div>
  );
}
