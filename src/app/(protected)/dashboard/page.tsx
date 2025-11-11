"use client";

import {
  AlarmClock,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  PiggyBank,
  Wallet,
} from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import { GlowCard, GridItem } from "@/components/gloweffect";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/helpers/formatCurrency";
import { trpc } from "@/lib/trpc/client";

type SnapshotKey =
  | "incomes"
  | "expenses"
  | "monthBalance"
  | "accumulatedBalance"
  | "pending";

type PaymentStatusKey = "onTime" | "late" | "pending";

const getMonthLabel = (date: Date, formatter: Intl.DateTimeFormat) => {
  const label = formatter.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export default function DashboardPage() {
  const { t, i18n } = useTranslation("dashboard");
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
    () => i18n.getFixedT(fallbackLng, "dashboard"),
    [i18n, fallbackLng],
  );

  const translate = isMounted ? t : fallbackT;

  const referenceDate = React.useMemo(() => new Date(), []);
  const months = 12;

  const { data, isLoading, isError, refetch } =
    trpc.transactions.dashboardSummary.useQuery({
      referenceDate,
      months,
    });

  const numberFormatter = React.useMemo(
    () =>
      new Intl.NumberFormat(i18n.language ?? "pt-BR", {
        maximumFractionDigits: 0,
      }),
    [i18n.language],
  );

  const monthFormatter = React.useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language ?? "pt-BR", {
        month: "short",
      }),
    [i18n.language],
  );

  const axisFormatter = React.useMemo(
    () =>
      new Intl.NumberFormat(i18n.language ?? "pt-BR", {
        notation: "compact",
        maximumFractionDigits: 1,
      }),
    [i18n.language],
  );

  const isLoadingState = isLoading && !data;

  const snapshotCards = React.useMemo(() => {
    const snapshot = data?.snapshot;

    const pendingCount = snapshot?.pendingPaymentsCount ?? 0;

    const monthBalanceIsNegative = (snapshot?.monthBalance ?? 0) < 0;
    const monthBalanceIconClassName = monthBalanceIsNegative
      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";

    const cards: Array<{
      key: SnapshotKey;
      title: string;
      value: string;
      subtitle: string;
      icon: React.ReactNode;
      valueClassName?: string;
      iconContainerClassName?: string;
    }> = [
      {
        key: "incomes",
        title: translate("snapshot.cards.incomes.title"),
        value: snapshot
          ? formatCurrency(snapshot.totalIncomes)
          : formatCurrency(0),
        subtitle: translate("snapshot.cards.incomes.subtitle"),
        icon: <ArrowUpRight className="size-4" />,
        iconContainerClassName:
          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      },
      {
        key: "expenses",
        title: translate("snapshot.cards.expenses.title"),
        value: snapshot
          ? formatCurrency(snapshot.totalExpenses)
          : formatCurrency(0),
        subtitle: translate("snapshot.cards.expenses.subtitle"),
        icon: <ArrowDownRight className="size-4" />,
        iconContainerClassName:
          "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      },
      {
        key: "monthBalance",
        title: translate("snapshot.cards.monthBalance.title"),
        value: snapshot
          ? formatCurrency(snapshot.monthBalance)
          : formatCurrency(0),
        subtitle: translate("snapshot.cards.monthBalance.subtitle"),
        icon: <Wallet className="size-4" />,
        valueClassName:
          snapshot && snapshot.monthBalance < 0
            ? "text-rose-500"
            : "text-emerald-500",
        iconContainerClassName: monthBalanceIconClassName,
      },
      {
        key: "accumulatedBalance",
        title: translate("snapshot.cards.accumulatedBalance.title"),
        value: snapshot
          ? formatCurrency(snapshot.accumulatedBalance)
          : formatCurrency(0),
        subtitle: translate("snapshot.cards.accumulatedBalance.subtitle"),
        icon: <PiggyBank className="size-4" />,
        valueClassName:
          snapshot && snapshot.accumulatedBalance < 0
            ? "text-rose-500"
            : undefined,
        iconContainerClassName: "bg-primary/10 text-primary",
      },
      {
        key: "pending",
        title: translate("snapshot.cards.pending.title"),
        value: numberFormatter.format(pendingCount),
        subtitle: translate("snapshot.cards.pending.subtitle", {
          count: pendingCount,
        }),
        icon: <AlarmClock className="size-4" />,
        iconContainerClassName:
          "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      },
    ];

    return cards;
  }, [data?.snapshot, numberFormatter, translate]);

  const monthlyTrendData = React.useMemo(() => {
    if (!data?.monthlyTrend?.length) {
      return [];
    }

    return data.monthlyTrend.map((item) => {
      const monthDate = new Date(item.monthStart);
      const label = `${getMonthLabel(monthDate, monthFormatter)} ${monthDate.getFullYear()}`;

      return {
        ...item,
        label,
      };
    });
  }, [data?.monthlyTrend, monthFormatter]);

  const distributionData = React.useMemo(() => {
    if (!data?.expenseDistribution?.length) {
      return [];
    }

    return data.expenseDistribution.map((item, index) => {
      const label =
        item.label ?? translate("charts.distribution.uncategorized");

      return {
        ...item,
        id: item.categoryId ?? `uncategorized-${index}`,
        label,
      };
    });
  }, [data?.expenseDistribution, translate]);

  const paymentStatuses = React.useMemo(() => {
    if (!data?.paymentStatus) {
      return [];
    }

    const statuses: Array<{
      key: PaymentStatusKey;
      title: string;
      description: string;
      value: number;
      icon: React.ReactNode;
      accentClassName: string;
    }> = [
      {
        key: "onTime",
        title: translate("payments.statuses.onTime.title"),
        description: translate("payments.statuses.onTime.description"),
        value: data.paymentStatus.onTime,
        icon: <CheckCircle2 className="size-4" />,
        accentClassName:
          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      },
      {
        key: "late",
        title: translate("payments.statuses.late.title"),
        description: translate("payments.statuses.late.description"),
        value: data.paymentStatus.late,
        icon: <Clock className="size-4" />,
        accentClassName: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      },
      {
        key: "pending",
        title: translate("payments.statuses.pending.title"),
        description: translate("payments.statuses.pending.description", {
          overdue: numberFormatter.format(data.paymentStatus.overdue),
        }),
        value: data.paymentStatus.pending,
        icon: <CircleDollarSign className="size-4" />,
        accentClassName: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      },
    ];

    return statuses;
  }, [data?.paymentStatus, numberFormatter, translate]);

  const monthlyChartConfig = React.useMemo(
    () => ({
      incomes: {
        label: translate("charts.monthly.legend.incomes"),
        color: "hsl(142, 72%, 45%)",
      },
      expenses: {
        label: translate("charts.monthly.legend.expenses"),
        color: "hsl(0, 72%, 55%)",
      },
    }),
    [translate],
  );

  const distributionChartConfig = React.useMemo(() => {
    if (!distributionData.length) {
      return {};
    }

    return distributionData.reduce<
      Record<string, { label: string; color: string }>
    >((acc, item) => {
      acc[item.id] = {
        label: item.label,
        color: item.color,
      };
      return acc;
    }, {});
  }, [distributionData]);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          {translate("heading.title")}
        </h2>
        <p className="text-muted-foreground text-sm">
          {translate("heading.description")}
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold">
              {translate("snapshot.title")}
            </h3>
            <p className="text-muted-foreground text-sm">
              {translate("snapshot.description")}
            </p>
          </div>
          {isError ? (
            <button
              type="button"
              onClick={() => void refetch()}
              className="text-primary inline-flex items-center gap-1 text-sm font-medium"
            >
              {translate("actions.retry")}
              <ArrowUpRight className="size-4" />
            </button>
          ) : null}
        </div>

        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {isLoadingState
            ? Array.from({ length: 5 }).map((_, index) => (
                <li key={`skeleton-${index}`} className="list-none">
                  <div className="border-border/60 relative h-full rounded-xl border p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </li>
              ))
            : snapshotCards.map((card) => (
                <GridItem
                  key={card.key}
                  icon={card.icon}
                  title={card.title}
                  value={card.value}
                  valueClassName={card.valueClassName}
                  iconContainerClassName={card.iconContainerClassName}
                  description={card.subtitle}
                />
              ))}
        </ul>
      </section>

      <section className="grid gap-6 lg:grid-cols-7">
        <GlowCard
          className="lg:col-span-4"
          title={translate("charts.monthly.title")}
          description={translate("charts.monthly.description")}
          contentClassName="gap-6"
        >
          {isLoadingState ? (
            <Skeleton className="h-[320px] w-full" />
          ) : monthlyTrendData.length ? (
            <ChartContainer config={monthlyChartConfig} className="h-[320px]">
              <BarChart data={monthlyTrendData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => axisFormatter.format(Number(value))}
                />
                <ChartTooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                  content={
                    <ChartTooltipContent
                      formatter={(value) => (
                        <span className="font-medium">
                          {formatCurrency(Number(value))}
                        </span>
                      )}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="incomes"
                  fill="var(--color-incomes)"
                  radius={6}
                  maxBarSize={48}
                />
                <Bar
                  dataKey="expenses"
                  fill="var(--color-expenses)"
                  radius={6}
                  maxBarSize={48}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <Empty className="h-[320px]">
              <EmptyHeader>
                <EmptyTitle>
                  {translate("charts.monthly.empty.title")}
                </EmptyTitle>
                <EmptyDescription>
                  {translate("charts.monthly.empty.description")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </GlowCard>

        <GlowCard
          className="lg:col-span-3"
          title={translate("payments.title")}
          description={translate("payments.description")}
          contentClassName="gap-6"
        >
          {isLoadingState ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={`status-${index}`} className="h-[72px] w-full" />
              ))}
            </div>
          ) : paymentStatuses.length ? (
            <div className="space-y-3">
              {paymentStatuses.map((status) => (
                <div
                  key={status.key}
                  className="border-border/50 bg-muted/30 flex items-start gap-3 rounded-lg border p-4"
                >
                  <div
                    className={`${status.accentClassName} mt-1 inline-flex size-8 items-center justify-center rounded-full`}
                  >
                    {status.icon}
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <p className="text-sm font-medium">{status.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {status.description}
                    </p>
                  </div>
                  <span className="text-foreground text-xl font-semibold">
                    {numberFormatter.format(status.value)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Empty className="h-[240px]">
              <EmptyHeader>
                <EmptyTitle>{translate("payments.empty.title")}</EmptyTitle>
                <EmptyDescription>
                  {translate("payments.empty.description")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </GlowCard>
      </section>

      <section>
        <GlowCard
          title={translate("charts.distribution.title")}
          description={translate("charts.distribution.description")}
          contentClassName="gap-6"
        >
          {isLoadingState ? (
            <Skeleton className="h-[320px] w-full" />
          ) : distributionData.length ? (
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <ChartContainer
                className="h-[320px] w-full max-w-xl"
                config={distributionChartConfig}
              >
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(
                          value,
                          _name,
                          _item,
                          _index,
                          tooltipPayload,
                        ) => {
                          const payloadWithPercentage = tooltipPayload as {
                            percentage?: number;
                          };
                          const percentage =
                            typeof payloadWithPercentage?.percentage ===
                            "number"
                              ? payloadWithPercentage.percentage
                              : undefined;

                          return (
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {formatCurrency(Number(value))}
                              </span>
                              {percentage !== undefined ? (
                                <span className="text-muted-foreground text-xs">
                                  {translate(
                                    "charts.distribution.tooltip.percentage",
                                    {
                                      value: percentage.toFixed(1),
                                    },
                                  )}
                                </span>
                              ) : null}
                            </div>
                          );
                        }}
                      />
                    }
                  />
                  <Pie
                    data={distributionData}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={70}
                    outerRadius={120}
                    strokeWidth={4}
                  >
                    {distributionData.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
              <div className="space-y-4 md:w-64">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {translate("charts.distribution.breakdownTitle")}
                </h4>
                <ul className="space-y-3">
                  {distributionData.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-muted-foreground">
                          {item.label}
                        </span>
                      </div>
                      <span className="font-medium">
                        {item.percentage.toFixed(1)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <Empty className="h-[320px] w-full">
              <EmptyHeader>
                <EmptyTitle>
                  {translate("charts.distribution.empty.title")}
                </EmptyTitle>
                <EmptyDescription>
                  {translate("charts.distribution.empty.description")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </GlowCard>
      </section>
    </div>
  );
}
