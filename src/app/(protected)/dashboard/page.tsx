"use client";

import * as React from "react";
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
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
} from "recharts";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    (Array.isArray(i18n.options?.fallbackLng) &&
      i18n.options.fallbackLng[0]) ||
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

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = trpc.transactions.dashboardSummary.useQuery({
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

    const cards: Array<{
      key: SnapshotKey;
      title: string;
      value: string;
      subtitle: string;
      icon: React.ReactNode;
      valueClassName?: string;
    }> = [
      {
        key: "incomes",
        title: translate("snapshot.cards.incomes.title"),
        value: snapshot
          ? formatCurrency(snapshot.totalIncomes)
          : formatCurrency(0),
        subtitle: translate("snapshot.cards.incomes.subtitle"),
        icon: <ArrowUpRight className="size-4 text-emerald-500" />,
      },
      {
        key: "expenses",
        title: translate("snapshot.cards.expenses.title"),
        value: snapshot
          ? formatCurrency(snapshot.totalExpenses)
          : formatCurrency(0),
        subtitle: translate("snapshot.cards.expenses.subtitle"),
        icon: <ArrowDownRight className="size-4 text-rose-500" />,
      },
      {
        key: "monthBalance",
        title: translate("snapshot.cards.monthBalance.title"),
        value: snapshot
          ? formatCurrency(snapshot.monthBalance)
          : formatCurrency(0),
        subtitle: translate("snapshot.cards.monthBalance.subtitle"),
        icon: (
          <Wallet
            className={`size-4 ${
              snapshot && snapshot.monthBalance >= 0
                ? "text-emerald-500"
                : "text-rose-500"
            }`}
          />
        ),
        valueClassName:
          snapshot && snapshot.monthBalance < 0
            ? "text-rose-500"
            : "text-emerald-500",
      },
      {
        key: "accumulatedBalance",
        title: translate("snapshot.cards.accumulatedBalance.title"),
        value: snapshot
          ? formatCurrency(snapshot.accumulatedBalance)
          : formatCurrency(0),
        subtitle: translate("snapshot.cards.accumulatedBalance.subtitle"),
        icon: <PiggyBank className="size-4 text-primary" />,
        valueClassName:
          snapshot && snapshot.accumulatedBalance < 0
            ? "text-rose-500"
            : undefined,
      },
      {
        key: "pending",
        title: translate("snapshot.cards.pending.title"),
        value: numberFormatter.format(pendingCount),
        subtitle: translate("snapshot.cards.pending.subtitle", {
          count: pendingCount,
        }),
        icon: <AlarmClock className="size-4 text-amber-500" />,
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
        item.label ??
        translate("charts.distribution.uncategorized");

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
        accentClassName: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
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

    return distributionData.reduce<Record<string, { label: string; color: string }>>(
      (acc, item) => {
        acc[item.id] = {
          label: item.label,
          color: item.color,
        };
        return acc;
      },
      {},
    );
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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {isLoadingState
            ? Array.from({ length: 5 }).map((_, index) => (
                <Card key={`skeleton-${index}`}>
                  <CardHeader>
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-3 w-2/3" />
                  </CardContent>
                </Card>
              ))
            : snapshotCards.map((card) => (
                <Card key={card.key} className="border-border/60">
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {card.title}
                    </CardTitle>
                    <div className="bg-muted inline-flex items-center justify-center rounded-full p-2">
                      {card.icon}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <p
                      className={`text-2xl font-semibold tabular-nums ${card.valueClassName ?? ""}`}
                    >
                      {card.value}
                    </p>
                    <CardDescription>{card.subtitle}</CardDescription>
                  </CardContent>
                </Card>
              ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-border/60">
          <CardHeader>
            <CardTitle>{translate("charts.monthly.title")}</CardTitle>
            <CardDescription>
              {translate("charts.monthly.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingState ? (
              <Skeleton className="h-[320px] w-full" />
            ) : monthlyTrendData.length ? (
              <ChartContainer
                config={monthlyChartConfig}
                className="h-[320px]"
              >
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
                    tickFormatter={(value) =>
                      axisFormatter.format(Number(value))
                    }
                  />
                  <ChartTooltip
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                    content={
                      <ChartTooltipContent
                        formatter={(value, key) => (
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
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-border/60">
          <CardHeader>
            <CardTitle>{translate("payments.title")}</CardTitle>
            <CardDescription>
              {translate("payments.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>{translate("charts.distribution.title")}</CardTitle>
            <CardDescription>
              {translate("charts.distribution.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            {isLoadingState ? (
              <Skeleton className="h-[320px] w-full" />
            ) : distributionData.length ? (
              <>
                <ChartContainer
                  className="h-[320px] w-full max-w-xl"
                  config={distributionChartConfig}
                >
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name, item, index, payload) => (
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {formatCurrency(Number(value))}
                              </span>
                              {"percentage" in payload
                                ? (
                                    <span className="text-muted-foreground text-xs">
                                      {translate(
                                        "charts.distribution.tooltip.percentage",
                                        {
                                          value: payload.percentage.toFixed(1),
                                        },
                                      )}
                                    </span>
                                  )
                                : null}
                            </div>
                          )}
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
              </>
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
          </CardContent>
        </Card>
      </section>
    </div>
  );
}