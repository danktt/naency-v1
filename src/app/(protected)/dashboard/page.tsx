"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/helpers/formatCurrency";
import { trpc } from "@/lib/trpc/client";
import { useUser } from "@clerk/nextjs";
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconPigMoney,
  IconWallet,
} from "@tabler/icons-react";
import { CheckCircle2, CircleDollarSign, Clock } from "lucide-react";
import * as React from "react";
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
  const { user } = useUser();

  const referenceDate = React.useMemo(() => new Date(), []);
  const months = 12;

  const { data, isLoading, isError, refetch } =
    trpc.transactions.dashboardSummary.useQuery({
      referenceDate,
      months,
    });

  const numberFormatter = React.useMemo(
    () =>
      new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: 0,
      }),
    [],
  );

  const monthFormatter = React.useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        month: "short",
      }),
    [],
  );

  const axisFormatter = React.useMemo(
    () =>
      new Intl.NumberFormat("pt-BR", {
        notation: "compact",
        maximumFractionDigits: 1,
      }),
    [],
  );

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    const name = user?.fullName ?? "";
    if (hour >= 5 && hour < 12) return `Bom dia, ${name}!`;
    if (hour >= 12 && hour < 18) return `Boa tarde, ${name}!`;
    return `Boa noite, ${name}!`;
  }, [user?.fullName]);

  const isLoadingState = isLoading && !data;

  const snapshotCards = React.useMemo<SnapshotCard[]>(() => {
    const snapshot = data?.snapshot;

    const monthBalanceIsNegative = (snapshot?.monthBalance ?? 0) < 0;
    const monthBalanceIconClassName = monthBalanceIsNegative
      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";

    const cards: SnapshotCard[] = [
      {
        key: "incomes",
        title: "Receitas",
        value: snapshot
          ? formatCurrency(snapshot.totalIncomes)
          : formatCurrency(0),
        subtitle: "Total recebido neste mês.",
        icon: IconArrowDownLeft,
        iconContainerClassName:
          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      },
      {
        key: "expenses",
        title: "Despesas",
        value: snapshot
          ? formatCurrency(snapshot.totalExpenses)
          : formatCurrency(0),
        subtitle: "Todos os gastos registrados no período.",
        icon: IconArrowUpRight,
        iconContainerClassName:
          "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      },
      {
        key: "monthBalance",
        title: "Saldo do mês",
        value: snapshot
          ? formatCurrency(snapshot.monthBalance)
          : formatCurrency(0),
        subtitle: "Receitas menos despesas do mês corrente.",
        icon: IconWallet,
        valueClassName:
          snapshot && snapshot.monthBalance < 0
            ? "text-rose-500"
            : "text-blue-500",
        iconContainerClassName: monthBalanceIconClassName,
      },
      {
        key: "accumulatedBalance",
        title: "Saldo acumulado",
        value: snapshot
          ? formatCurrency(snapshot.accumulatedBalance)
          : formatCurrency(0),
        subtitle: "Saldo considerando meses anteriores.",
        icon: IconPigMoney,
        valueClassName:
          snapshot && snapshot.accumulatedBalance < 0
            ? "text-rose-500"
            : undefined,
        iconContainerClassName: "bg-primary/10 text-primary",
      },
    ];

    return cards;
  }, [data?.snapshot]);

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
      const label = item.label ?? "Sem categoria";

      return {
        ...item,
        id: item.categoryId ?? `uncategorized-${index}`,
        label,
      };
    });
  }, [data?.expenseDistribution]);

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
      const sectionDataset = dataset[sectionKey];

      const statuses = statusDefinitions.map((definition) => {
        const value = sectionDataset?.[definition.key] ?? 0;

        let description = "";
        if (definition.key === "onTime") {
          description = "Transações pagas até a data de vencimento.";
        } else if (definition.key === "late") {
          description = "Transações pagas após a data de vencimento.";
        } else if (definition.key === "pending") {
          const overdue = numberFormatter.format(sectionDataset?.overdue ?? 0);
          description = `Inclui ${overdue} transações em atraso.`;
        }

        let title = "";
        if (definition.key === "onTime") title = "Pago no prazo";
        if (definition.key === "late") title = "Pago com atraso";
        if (definition.key === "pending") title = "Atrasado / pendente";

        return {
          ...definition,
          title,
          description,
          value,
        };
      });

      const titles = {
        incomes: "Receitas",
        expenses: "Despesas",
      };
      const descriptions = {
        incomes: "Status das receitas registradas neste mês.",
        expenses: "Status das despesas registradas neste mês.",
      };
      const ctas = {
        incomes: "Ir para receitas",
        expenses: "Ir para despesas",
      };

      return {
        key: sectionKey,
        href: sectionKey === "incomes" ? "/incomes" : "/expenses",
        title: titles[sectionKey],
        description: descriptions[sectionKey],
        cta: ctas[sectionKey],
        statuses,
      };
    });
  }, [data?.paymentStatus, numberFormatter]);

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
        label: "Receitas",
        color: "var(--chart-2)",
      },
      expenses: {
        label: "Despesas",
        color: "var(--chart-1)",
      },
    }),
    [],
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
          {isLoadingState ? <Skeleton className="w-96 h-6" /> : greeting}
        </h2>
        <p className="text-muted-foreground text-sm">
          Acompanhe como suas contas estão evoluindo neste mês.
        </p>
      </section>

      <SnapshotSection
        title="Resumo do mês atual"
        description="Monitore entradas, saídas e saldo em tempo real."
        retryLabel="Tentar novamente"
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
          onBarHover={handleMonthlyBarHover}
          isLoading={isLoadingState}
        />

        <PaymentsCard
          sections={paymentSections}
          hasPaymentStatuses={hasPaymentStatuses}
          isLoading={isLoadingState}
          formatNumber={(value) => numberFormatter.format(value)}
        />
      </section>

      <section>
        <DistributionCard
          data={distributionData}
          chartConfig={distributionChartConfig}
          isLoading={isLoadingState}
        />
      </section>
    </div>
  );
}
