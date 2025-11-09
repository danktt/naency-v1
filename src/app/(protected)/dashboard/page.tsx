"use client";

import { ArrowUpRight, CalendarDays, CheckCircle2, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

const metrics = [
  {
    titleKey: "metrics.activeAutomations.title",
    changeKey: "metrics.activeAutomations.change",
    value: "12",
    icon: Zap,
  },
  {
    titleKey: "metrics.completedTasks.title",
    changeKey: "metrics.completedTasks.change",
    value: "248",
    icon: CheckCircle2,
  },
  {
    titleKey: "metrics.upcomingReviews.title",
    changeKey: "metrics.upcomingReviews.change",
    value: "4",
    icon: CalendarDays,
  },
];

const recentItems = [
  "recent.items.automationSync",
  "recent.items.newPrompt",
  "recent.items.datasetRefreshed",
];

export default function DashboardPage() {
  const { t } = useTranslation("dashboard");

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("heading.title")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("heading.description")}</p>
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
        <div className="border-border/60 bg-card text-card-foreground overflow-hidden rounded-xl border shadow-sm">
          <div className="flex flex-row items-center justify-between border-b px-6 py-4">
            <div>
              <h3 className="text-base font-semibold">{t("recent.title")}</h3>
              <p className="text-muted-foreground text-sm">
                {t("recent.description")}
              </p>
            </div>
            <button
              type="button"
              className="text-primary inline-flex items-center gap-1 text-sm font-medium"
            >
              {t("recent.cta")}
              <ArrowUpRight className="size-4" />
            </button>
          </div>
          <div className="space-y-4 px-6 py-5">
            {recentItems.map((itemKey) => (
              <div
                key={itemKey}
                className="border-border/60 flex items-start justify-between rounded-md border px-4 py-3"
              >
                <div>
                  <p className="font-medium text-sm">{t(itemKey)}</p>
                  <p className="text-muted-foreground text-xs">
                    {t("recent.timestamp")}
                  </p>
                </div>
                <span className="bg-muted text-muted-foreground inline-flex rounded-full px-2 py-0.5 text-xs">
                  {t("recent.badge")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
