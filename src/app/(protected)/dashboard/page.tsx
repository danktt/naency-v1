"use client";

import {
  IconAlarm,
  IconArrowDownRight,
  IconArrowUpRight,
  IconClock,
  IconPigMoney,
  IconWallet,
} from "@tabler/icons-react";
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
import Link from "next/link";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      icon: React.ElementType;
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
        icon: IconArrowUpRight,
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
        icon: IconArrowDownRight,
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
        icon: IconWallet,
        valueClassName:
          snapshot && snapshot.monthBalance < 0
            ? "text-rose-500"
            : "text-blue-500",
        iconContainerClassName: monthBalanceIconClassName,
      },
      {
        key: "accumulatedBalance",
        title: translate("snapshot.cards.accumulatedBalance.title"),
        value: snapshot
          ? formatCurrency(snapshot.accumulatedBalance)
          : formatCurrency(0),
        subtitle: translate("snapshot.cards.accumulatedBalance.subtitle"),
        icon: IconPigMoney,
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
        icon: IconAlarm,
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

  const [activeMonthlyIndex, setActiveMonthlyIndex] = React.useState<
    number | null
  >(null);
  const monthlyPatternId = React.useId();

  const highlightedMonthlyEntry = React.useMemo(() => {
    if (
      activeMonthlyIndex === null ||
      activeMonthlyIndex < 0 ||
      activeMonthlyIndex >= monthlyTrendData.length
    ) {
      return null;
    }

    return {
      index: activeMonthlyIndex,
      data: monthlyTrendData[activeMonthlyIndex],
    };
  }, [activeMonthlyIndex, monthlyTrendData]);

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

  const paymentSections = React.useMemo(() => {
    const statusDefinitions: Array<{
      key: PaymentStatusKey;
      icon: React.ReactNode;
      accentClassName: string;
    }> = [
      {
        key: "onTime",
        icon: <CheckCircle2 className="size-4" />,
        accentClassName:
          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      },
      {
        key: "late",
        icon: <Clock className="size-4" />,
        accentClassName: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      },
      {
        key: "pending",
        icon: <CircleDollarSign className="size-4" />,
        accentClassName: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      },
    ];

    const dataset = data?.paymentStatus ?? {
      incomes: { onTime: 0, late: 0, pending: 0, overdue: 0 },
      expenses: { onTime: 0, late: 0, pending: 0, overdue: 0 },
    };

    return (["incomes", "expenses"] as const).map((sectionKey) => {
      const sectionLabel = `payments.sections.${sectionKey}` as const;
      const sectionDataset = dataset[sectionKey];

      const statuses = statusDefinitions.map((definition) => {
        const value = sectionDataset?.[definition.key] ?? 0;
        const description =
          definition.key === "pending"
            ? translate(`payments.statuses.${definition.key}.description`, {
                overdue: numberFormatter.format(sectionDataset?.overdue ?? 0),
              })
            : translate(`payments.statuses.${definition.key}.description`);

        return {
          ...definition,
          title: translate(`payments.statuses.${definition.key}.title`),
          description,
          value,
        };
      });

      return {
        key: sectionKey,
        href: sectionKey === "incomes" ? "/incomes" : "/expenses",
        title: translate(`${sectionLabel}.title`),
        description: translate(`${sectionLabel}.description`),
        cta: translate(`${sectionLabel}.cta`),
        statuses,
      };
    });
  }, [data?.paymentStatus, numberFormatter, translate]);

  const hasPaymentStatuses = React.useMemo(
    () =>
      paymentSections.some((section) =>
        section.statuses.some((status) => status.value > 0),
      ),
    [paymentSections],
  );

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
          {snapshotCards.map((card) => {
            const Icon = card.icon as React.ElementType;
            return (
              <GridItem
                key={card.key}
                icon={<Icon className="size-5 " stroke={1.5} />}
                title={card.title}
                value={card.value}
                valueClassName={card.valueClassName}
                iconContainerClassName={card.iconContainerClassName}
                description={card.subtitle}
                isLoading={isLoadingState}
              />
            );
          })}
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
            <>
              {highlightedMonthlyEntry ? (
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {highlightedMonthlyEntry.data.label}
                  </span>
                  <span>
                    {translate("charts.monthly.legend.incomes")}:{" "}
                    {formatCurrency(highlightedMonthlyEntry.data.incomes)}
                  </span>
                  <span>
                    {translate("charts.monthly.legend.expenses")}:{" "}
                    {formatCurrency(highlightedMonthlyEntry.data.expenses)}
                  </span>
                </div>
              ) : null}
              <ChartContainer config={monthlyChartConfig} className="h-[320px]">
                <BarChart
                  data={monthlyTrendData}
                  barCategoryGap={24}
                  onMouseLeave={() => setActiveMonthlyIndex(null)}
                >
                  <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill={`url(#${monthlyPatternId})`}
                  />
                  <defs>
                    <MonthlyTrendBackgroundPattern id={monthlyPatternId} />
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tickMargin={12}
                    tickFormatter={(value) =>
                      typeof value === "string" ? value.split(" ")[0] : value
                    }
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) =>
                      axisFormatter.format(Number(value))
                    }
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        indicator="dashed"
                        labelFormatter={(_label, payload) =>
                          payload?.[0]?.payload?.label
                        }
                        formatter={(value) => (
                          <span className="font-medium">
                            {formatCurrency(Number(value))}
                          </span>
                        )}
                      />
                    }
                  />
                  <Bar
                    dataKey="incomes"
                    fill="var(--color-incomes)"
                    radius={6}
                    maxBarSize={48}
                  >
                    {monthlyTrendData.map((_, index) => (
                      <Cell
                        key={`monthly-incomes-${index}`}
                        fillOpacity={
                          highlightedMonthlyEntry &&
                          highlightedMonthlyEntry.index !== index
                            ? 0.35
                            : 1
                        }
                        stroke={
                          highlightedMonthlyEntry?.index === index
                            ? "var(--color-incomes)"
                            : undefined
                        }
                        strokeWidth={
                          highlightedMonthlyEntry?.index === index ? 1.5 : 0
                        }
                        className="cursor-pointer transition-all duration-200 ease-out"
                        onMouseEnter={() => setActiveMonthlyIndex(index)}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="expenses"
                    fill="var(--color-expenses)"
                    radius={6}
                    maxBarSize={48}
                  >
                    {monthlyTrendData.map((_, index) => (
                      <Cell
                        key={`monthly-expenses-${index}`}
                        fillOpacity={
                          highlightedMonthlyEntry &&
                          highlightedMonthlyEntry.index !== index
                            ? 0.35
                            : 1
                        }
                        stroke={
                          highlightedMonthlyEntry?.index === index
                            ? "var(--color-expenses)"
                            : undefined
                        }
                        strokeWidth={
                          highlightedMonthlyEntry?.index === index ? 1.5 : 0
                        }
                        className="cursor-pointer transition-all duration-200 ease-out"
                        onMouseEnter={() => setActiveMonthlyIndex(index)}
                      />
                    ))}
                  </Bar>
                  <ChartLegend content={<ChartLegendContent />} />
                </BarChart>
              </ChartContainer>
            </>
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
          ) : hasPaymentStatuses ? (
            <Tabs defaultValue="incomes">
              <TabsList>
                {paymentSections.map((section) => (
                  <TabsTrigger key={section.key} value={section.key}>
                    {section.title}
                  </TabsTrigger>
                ))}
              </TabsList>
              {paymentSections.map((section) => (
                <TabsContent key={section.key} value={section.key}>
                  <div className="space-y-3 rounded-lg border border-border/40 bg-muted/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{section.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {section.description}
                        </p>
                      </div>
                      <Link
                        href={section.href}
                        className="text-primary inline-flex items-center gap-1 text-xs font-medium"
                      >
                        {section.cta}
                        <ArrowUpRight className="size-3" />
                      </Link>
                    </div>
                    <div className="space-y-3">
                      {section.statuses.map((status) => (
                        <div
                          key={`${section.key}-${status.key}`}
                          className="border-border/50 bg-background/60 flex items-start gap-3 rounded-lg border p-4"
                        >
                          <div
                            className={`${status.accentClassName} mt-1 inline-flex size-8 items-center justify-center rounded-full`}
                          >
                            {status.icon}
                          </div>
                          <div className="flex flex-1 flex-col gap-1">
                            <p className="text-sm font-medium">
                              {status.title}
                            </p>
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
                  </div>
                </TabsContent>
              ))}
            </Tabs>
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

function MonthlyTrendBackgroundPattern({ id }: { id: string }) {
  return (
    <pattern
      id={id}
      x="0"
      y="0"
      width="12"
      height="12"
      patternUnits="userSpaceOnUse"
    >
      <circle cx="2" cy="2" r="1" fill="hsl(var(--muted) / 0.25)" />
    </pattern>
  );
}
