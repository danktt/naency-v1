 "use client";

import { CalendarDays, CheckCircle2, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

import { IncomesForm } from "@/components/forms/incomesForm";
import { IncomesTable } from "./_components/IncomesTable";

const metrics = [
  {
    titleKey: "metrics.totalIncomes.title",
    changeKey: "metrics.totalIncomes.change",
    value: "12",
    icon: Zap,
  },
  {
    titleKey: "metrics.totalExpenses.title",
    changeKey: "metrics.totalExpenses.change",
    value: "248",
    icon: CheckCircle2,
  },
  {
    titleKey: "metrics.netBalance.title",
    changeKey: "metrics.netBalance.change",
    value: "4",
    icon: CalendarDays,
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
          <p className="text-muted-foreground text-sm">{t("header.subtitle")}</p>
        </div>
        <div>
          <IncomesForm />
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <div
            key={metric.titleKey}
            className="border-border/60 bg-card text-card-foreground relative overflow-hidden rounded-xl border p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{t(metric.titleKey)}</p>
              <metric.icon className="text-muted-foreground size-4" />
            </div>
            <div className="mt-4 text-2xl font-semibold">{metric.value}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              {t(metric.changeKey)}
            </p>
          </div>
        ))}
      </section>
      <section>
        <IncomesTable />
      </section>
    </div>
  );
}
