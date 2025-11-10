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

import { IncomesTable } from "./_components/IncomesTable";

const metrics = [
  {
    titleKey: "metrics.totalIncomes.title",
    changeKey: "metrics.totalIncomes.change",
    value: "12",
    icon: IconCurrencyDollar,
  },
  {
    titleKey: "metrics.totalExpenses.title",
    changeKey: "metrics.totalExpenses.change",
    value: "248",
    icon: IconWallet,
  },
  {
    titleKey: "metrics.netBalance.title",
    changeKey: "metrics.netBalance.change",
    value: "4",
    icon: IconChartBar,
  },
];

export default function IncomesPage() {
  const { t, i18n } = useTranslation("incomes");
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
    () => i18n.getFixedT(fallbackLng, "incomes"),
    [i18n, fallbackLng],
  );

  const translate = isMounted ? t : fallbackT;

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
        {metrics.map((metric) => {
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
              value={metric.value}
              description={translate(metric.changeKey)}
            />
          );
        })}
      </ul>
      <section>
        <IncomesTable />
      </section>
    </div>
  );
}
