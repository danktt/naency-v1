"use client";

import {
  IconAlarm,
  IconArrowDownRight,
  IconArrowUpRight,
  IconPigMoney,
  IconWallet,
} from "@tabler/icons-react";
import { CheckCircle2, CircleDollarSign, Clock } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/helpers/formatCurrency";
import { trpc } from "@/lib/trpc/client";
import { DistributionCard } from "./_components/DistributionCard";
import { MonthlyTrendCard } from "./_components/MonthlyTrendCard";
import { type PaymentSection, PaymentsCard } from "./_components/PaymentsCard";
import {
  type SnapshotCard,
  SnapshotSection,
} from "./_components/SnapshotSection";

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

  const snapshotCards = React.useMemo<SnapshotCard[]>(() => {
    const snapshot = data?.snapshot;

    const pendingCount = snapshot?.pendingPaymentsCount ?? 0;

    const monthBalanceIsNegative = (snapshot?.monthBalance ?? 0) < 0;
    const monthBalanceIconClassName = monthBalanceIsNegative
      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";

    const cards: SnapshotCard[] = [
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

  const handleMonthlyBarHover = React.useCallback((index: number | null) => {
    setActiveMonthlyIndex(index);
  }, []);

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

  const paymentSections = React.useMemo<PaymentSection[]>(() => {
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
        color: "var(--chart-2)",
      },
      expenses: {
        label: translate("charts.monthly.legend.expenses"),
        color: "var(--chart-1)",
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
    <div className="space-y-4">
      <section className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          {translate("heading.title")}
        </h2>
        <p className="text-muted-foreground text-sm">
          {translate("heading.description")}
        </p>
      </section>

      <SnapshotSection
        title={translate("snapshot.title")}
        description={translate("snapshot.description")}
        retryLabel={translate("actions.retry")}
        isLoading={isLoadingState}
        isError={isError}
        cards={snapshotCards}
        onRetry={() => void refetch()}
      />

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MonthlyTrendCard
          data={monthlyTrendData}
          highlightedEntry={highlightedMonthlyEntry}
          patternId={monthlyPatternId}
          chartConfig={monthlyChartConfig}
          axisFormatter={axisFormatter}
          translate={translate}
          onBarHover={handleMonthlyBarHover}
          isLoading={isLoadingState}
        />

        <PaymentsCard
          sections={paymentSections}
          hasPaymentStatuses={hasPaymentStatuses}
          isLoading={isLoadingState}
          translate={translate}
          formatNumber={(value) => numberFormatter.format(value)}
        />
      </section>

      <section>
        <DistributionCard
          data={distributionData}
          chartConfig={distributionChartConfig}
          isLoading={isLoadingState}
          translate={translate}
        />
      </section>
    </div>
  );
}
