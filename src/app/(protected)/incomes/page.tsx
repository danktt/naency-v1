"use client";

import {
  IconChartBar,
  IconCurrencyDollar,
  IconWallet,
} from "@tabler/icons-react";
import { CalendarDays, CheckCircle2, Zap } from "lucide-react";
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
  const { t } = useTranslation("incomes");

  return (
    <div className="space-y-8">
      <section className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("header.title")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("header.subtitle")}
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
              title={t(metric.titleKey)}
              value={metric.value}
              description={t(metric.changeKey)}
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
