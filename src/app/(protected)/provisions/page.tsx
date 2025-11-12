"use client";

import {
  IconCalendarDollar,
  IconSparkles,
  IconTargetArrow,
} from "@tabler/icons-react";
import { addDays, addMonths } from "date-fns";
import {
  BrainCircuit,
  Rocket,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { BreadcrumbComponent } from "@/components/Breadcrumb";
import { type CalendarEvent, EventCalendar } from "@/components/event-calendar";
import { GlowCard, GridItem } from "@/components/gloweffect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/helpers/formatCurrency";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

type ChartView = "focus" | "quarters";

type Insight = {
  id: string;
  title: string;
  description: string;
  impact: string;
  metric: string;
  accent: string;
  badgeClassName: string;
};

type ProvisionAction = {
  id: string;
  title: string;
  description: string;
  cta: string;
  icon: ReactNode;
  accentClassName: string;
};

type RiskLevel = "healthy" | "attention" | "critical";

type UiProvisionRecord = {
  id: string;
  categoryId: string;
  month: number;
  year: number;
  plannedAmount: number;
  committedAmount: number;
  coverage: number;
  risk: RiskLevel;
  variance: number;
  category: {
    name: string;
    color: string;
  };
  createdAt: string;
};

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long" });

const monthOptions = Array.from({ length: 12 }, (_, month) => {
  const label = capitalize(monthFormatter.format(new Date(2025, month, 1)));

  return {
    value: month.toString(),
    label,
  };
});

const yearOptions = (() => {
  const currentYear = new Date().getFullYear();

  return Array.from({ length: 5 }, (_, index) => {
    const year = currentYear - 1 + index;
    return {
      value: year.toString(),
      label: year.toString(),
    };
  });
})();

const PROVISION_INSIGHTS: Insight[] = [
  {
    id: "holiday",
    title: "Provisionar 13º salário antecipado",
    description:
      "Reserve R$ 62 mil em novembro para equilibrar o pico de folha e benefícios antes de dezembro.",
    impact: "Impacto alto",
    metric: "+R$ 62 mil",
    accent: "#10b981",
    badgeClassName:
      "border-emerald-500/40 text-emerald-600 dark:text-emerald-300",
  },
  {
    id: "suppliers",
    title: "Renegociar fornecedores de nuvem",
    description:
      "Migrar workloads não críticos para instâncias spot libera até 8% do orçamento de FinOps.",
    impact: "Impacto médio",
    metric: "−R$ 7,8 mil",
    accent: "#6366f1",
    badgeClassName: "border-indigo-500/40 text-indigo-600 dark:text-indigo-300",
  },
  {
    id: "cx-labs",
    title: "Antecipar squad CX híbrido",
    description:
      "Reforçar a equipe em 2 FTEs reduz o tempo médio de atendimento VIP em 18%.",
    impact: "Atenção imediata",
    metric: "+2 FTE",
    accent: "#f97316",
    badgeClassName: "border-amber-500/40 text-amber-600 dark:text-amber-300",
  },
];

const PROVISION_ACTIONS: ProvisionAction[] = [
  {
    id: "ai-balance",
    title: "Auto-calibrar marketing vs. pessoas",
    description:
      "Distribui verba considerando metas de aquisição e headcount previsto.",
    cta: "Executar IA",
    icon: <BrainCircuit className="size-4" />,
    accentClassName: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  },
  {
    id: "scenario",
    title: "Simular cenário conservador",
    description:
      "Aplica corte de 5% em categorias de menor impacto para preservar caixa.",
    cta: "Rodar simulação",
    icon: <Wand2 className="size-4" />,
    accentClassName: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
  },
  {
    id: "contingency",
    title: "Liberar verba contingencial",
    description:
      "Realoca R$ 30 mil do fundo de inovação para cobrir backlog crítico de CX.",
    cta: "Liberar agora",
    icon: <Rocket className="size-4" />,
    accentClassName: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  },
];

const QUARTER_CHART_DATA = [
  { label: "Q1", planned: 48000, committed: 45200 },
  { label: "Q2", planned: 51200, committed: 47600 },
  { label: "Q3", planned: 53800, committed: 49200 },
  { label: "Q4", planned: 56200, committed: 50800 },
];

const RISK_CONFIG: Record<RiskLevel, { label: string; className: string }> = {
  healthy: {
    label: "No alvo",
    className:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-transparent",
  },
  attention: {
    label: "Atenção",
    className:
      "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-transparent",
  },
  critical: {
    label: "Crítico",
    className:
      "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-transparent",
  },
};

const CHART_CONFIG: ChartConfig = {
  planned: {
    label: "Planejado",
    color: "hsl(158, 73%, 45%)",
  },
  committed: {
    label: "Comprometido",
    color: "hsl(266, 83%, 66%)",
  },
};

const numberFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export default function ProvisionsPage() {
  const now = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(
    now.getFullYear().toString(),
  );
  const [chartView, setChartView] = useState<ChartView>("focus");
  const [insightTab, setInsightTab] = useState("insights");

  const selectedDate = useMemo(
    () => new Date(Number(selectedYear), Number(selectedMonth), 1),
    [selectedMonth, selectedYear],
  );

  const selectedMonthLabel = useMemo(() => {
    const label = capitalize(monthFormatter.format(selectedDate));
    return `${label} de ${selectedDate.getFullYear()}`;
  }, [selectedDate]);

  const selectedMonthNumber = useMemo(
    () => Number(selectedMonth),
    [selectedMonth],
  );
  const selectedYearNumber = useMemo(
    () => Number(selectedYear),
    [selectedYear],
  );

  const periodInput = useMemo(
    () => ({
      month: selectedMonthNumber,
      year: selectedYearNumber,
    }),
    [selectedMonthNumber, selectedYearNumber],
  );

  const summaryQuery = trpc.provisions.summary.useQuery(periodInput);
  const distributionQuery = trpc.provisions.distribution.useQuery(periodInput);
  const listQuery = trpc.provisions.list.useQuery(periodInput);

  const summary = summaryQuery.data ?? {
    plannedTotal: 0,
    committedTotal: 0,
    remainingTotal: 0,
    coverage: 0,
    automation: {
      autopilotTracked: 0,
      autopilotEnabled: 0,
      ratio: 0,
    },
  };

  const formatMetricValue = (formatter: () => string) => {
    if (summaryQuery.isError) {
      return "—";
    }
    if (summaryQuery.isLoading && !summaryQuery.data) {
      return "Carregando...";
    }
    return formatter();
  };

  const formatMetricDescription = (formatter: () => string) => {
    if (summaryQuery.isError) {
      return "Não foi possível carregar os dados.";
    }
    if (summaryQuery.isLoading && !summaryQuery.data) {
      return "Carregando...";
    }
    return formatter();
  };

  const listCountDescription = listQuery.isError
    ? "Erro ao carregar as provisões."
    : listQuery.isLoading && !listQuery.data
      ? "Carregando..."
      : `${listQuery.data?.length ?? 0} provisões cadastradas`;

  const stats = useMemo(
    () => [
      {
        title: "Total planejado",
        description: listCountDescription,
        icon: (
          <IconCalendarDollar
            className="size-5 text-black dark:text-neutral-400"
            stroke={1.5}
          />
        ),
        value: formatMetricValue(() => formatCurrency(summary.plannedTotal)),
      },
      {
        title: "Cobertura comprometida",
        description: formatMetricDescription(
          () => `${formatCurrency(summary.committedTotal)} vinculados`,
        ),
        icon: (
          <IconTargetArrow
            className="size-5 text-black dark:text-neutral-400"
            stroke={1.5}
          />
        ),
        value: formatMetricValue(() => `${summary.coverage.toFixed(1)}%`),
      },
      {
        title: "Automação ativa",
        description: formatMetricDescription(
          () => `${summary.automation.autopilotTracked} trilhas monitoradas`,
        ),
        icon: (
          <IconSparkles
            className="size-5 text-black dark:text-neutral-400"
            stroke={1.5}
          />
        ),
        value: formatMetricValue(
          () => `${Math.round(summary.automation.ratio)}%`,
        ),
      },
    ],
    [
      listCountDescription,
      summary.automation.autopilotTracked,
      summary.automation.ratio,
      summary.committedTotal,
      summary.coverage,
      summary.plannedTotal,
      summaryQuery.isError,
      summaryQuery.isLoading,
      summaryQuery.data,
    ],
  );

  const distributionData = distributionQuery.data ?? [];

  const chartData = useMemo(
    () =>
      distributionData.map((item) => ({
        label: item.category.name,
        planned: item.plannedAmount,
        committed: item.committedAmount,
      })),
    [distributionData],
  );

  const chartViewData = chartView === "focus" ? chartData : QUARTER_CHART_DATA;
  const isFocusChart = chartView === "focus";
  const isChartLoading =
    isFocusChart && distributionQuery.isLoading && !distributionQuery.data;
  const isChartError = isFocusChart && distributionQuery.isError;
  const hasChartData = chartViewData.length > 0;

  const varianceLeaders = useMemo(() => {
    if (!distributionData.length) {
      return [];
    }

    return [...distributionData]
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
      .slice(0, 3);
  }, [distributionData]);

  const provisionsList = useMemo<UiProvisionRecord[]>(() => {
    return (listQuery.data ?? []).map((item) => {
      const coverage =
        item.plannedAmount === 0
          ? 0
          : (item.committedAmount / item.plannedAmount) * 100;
      const risk: RiskLevel =
        coverage >= 110 ? "critical" : coverage >= 90 ? "attention" : "healthy";

      return {
        ...item,
        coverage,
        risk,
        variance: item.committedAmount - item.plannedAmount,
      };
    });
  }, [listQuery.data]);

  const atRiskRecords = useMemo(
    () => provisionsList.filter((record) => record.risk !== "healthy"),
    [provisionsList],
  );

  const isListLoading = listQuery.isLoading && !listQuery.data;
  const listError = listQuery.isError;

  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    const baseDate = new Date(Number(selectedYear), Number(selectedMonth), 5);

    return [
      {
        id: "kickoff",
        title: "Kickoff provisões squads",
        description: "Ajustar pesos para OKRs do trimestre",
        start: addDays(baseDate, 1),
        end: addDays(baseDate, 1),
        allDay: true,
        color: "emerald",
      },
      {
        id: "finops-review",
        title: "Revisão FinOps com fornecedores",
        description: "Confirmar renegociação e liberar verba contingente",
        start: addDays(baseDate, 6),
        end: addDays(baseDate, 6),
        color: "orange",
      },
      {
        id: "cx-checkpoint",
        title: "Checkpoint CX crítico",
        description: "Reforço operacional nas filas VIP",
        start: addDays(baseDate, 10),
        end: addDays(baseDate, 10),
        color: "rose",
      },
      {
        id: "board-sync",
        title: "Prévia para comitê executivo",
        description: "Apresentar cenário consolidado de provisões",
        start: addDays(baseDate, 15),
        end: addDays(baseDate, 15),
        color: "amber",
      },
      {
        id: "forecast",
        title: "Rodar previsão automática do próximo mês",
        description: "Pipeline IA para gerar deltas e recomendações",
        start: addMonths(baseDate, 0),
        end: addMonths(baseDate, 0),
        allDay: true,
        color: "violet",
      },
    ];
  }, [selectedMonth, selectedYear]);

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-3">
            <BreadcrumbComponent />
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="uppercase tracking-wide">
                Provisions Lab
              </Badge>
              <Badge variant="outline" className="border-dashed">
                Beta
              </Badge>
            </div>
            <div className="space-y-1">
              <h2 className="text-3xl font-semibold tracking-tight">
                Provisions
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Coordene provisões mensais com previsões assistidas por IA e
                mantenha a saúde financeira dos squads em tempo real.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger size="sm" className="min-w-[160px]">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger size="sm" className="min-w-[120px]">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<SlidersHorizontal className="size-4" />}
          >
            Ajustar pesos
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Upload className="size-4" />}
          >
            Importar planilha
          </Button>
          <Button size="sm" icon={<Sparkles className="size-4" />}>
            Criar previsão com IA
          </Button>
        </div>
      </section>

      <section>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((metric) => (
            <GridItem
              key={metric.title}
              icon={metric.icon}
              title={metric.title}
              value={metric.value}
              description={metric.description}
            />
          ))}
        </ul>
      </section>

      <section className="grid gap-6 xl:grid-cols-7">
        <GlowCard
          className="xl:col-span-4"
          title="Distribuição estratégica"
          description="Compare a verba planejada com o comprometido por foco ou trimestre."
          contentClassName="gap-6"
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Tabs
                value={chartView}
                onValueChange={(value) => setChartView(value as ChartView)}
              >
                <TabsList>
                  <TabsTrigger value="focus">Focos estratégicos</TabsTrigger>
                  <TabsTrigger value="quarters">Trimestres</TabsTrigger>
                </TabsList>
              </Tabs>
              <Badge variant="outline" className="border-dashed">
                {selectedMonthLabel}
              </Badge>
            </div>
            {isChartError ? (
              <div className="text-muted-foreground text-sm">
                Não foi possível carregar o gráfico no momento.
              </div>
            ) : isChartLoading ? (
              <div className="text-muted-foreground text-sm">
                Carregando dados do período selecionado...
              </div>
            ) : hasChartData ? (
              <ChartContainer config={CHART_CONFIG} className="h-[320px]">
                <BarChart data={chartViewData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tickMargin={12}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) =>
                      numberFormatter.format(Number(value))
                    }
                  />
                  <ChartTooltip
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }}
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
                    dataKey="planned"
                    fill="var(--color-planned)"
                    radius={6}
                    maxBarSize={42}
                  />
                  <Bar
                    dataKey="committed"
                    fill="var(--color-committed)"
                    radius={6}
                    maxBarSize={42}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="text-muted-foreground text-sm">
                Nenhuma provisão cadastrada para o período selecionado.
              </div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {distributionQuery.isError ? (
              <p className="text-muted-foreground text-sm">
                Não foi possível carregar as variações por categoria.
              </p>
            ) : distributionQuery.isLoading && !distributionQuery.data ? (
              <p className="text-muted-foreground text-sm">
                Calculando variações...
              </p>
            ) : varianceLeaders.length ? (
              varianceLeaders.map((record) => {
                const coverage =
                  record.plannedAmount === 0
                    ? 0
                    : Math.min(
                        120,
                        Math.round(
                          (record.committedAmount / record.plannedAmount) * 100,
                        ),
                      );

                return (
                  <div
                    key={record.categoryId}
                    className="border-border/50 bg-muted/30 flex flex-col gap-3 rounded-lg border p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          {record.category.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Planejado: {formatCurrency(record.plannedAmount)}
                          {" · "}
                          Comprometido: {formatCurrency(record.committedAmount)}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-transparent font-medium",
                          record.variance >= 0
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-300",
                        )}
                      >
                        {record.variance >= 0 ? "+" : ""}
                        {formatCurrency(record.variance)}
                      </Badge>
                    </div>
                    <div className="bg-muted relative h-2 w-full overflow-hidden rounded-full">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          width: `${coverage}%`,
                          backgroundColor: record.category.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground text-sm">
                Nenhuma categoria com variação relevante neste período.
              </p>
            )}
          </div>
        </GlowCard>

        <GlowCard
          className="xl:col-span-3"
          title="Radar inteligente"
          description="Insights e ações sugeridas pela IA para o período selecionado."
          contentClassName="gap-6"
        >
          <Tabs value={insightTab} onValueChange={setInsightTab}>
            <TabsList>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="actions">Próximas ações</TabsTrigger>
            </TabsList>
            <TabsContent value="insights" className="mt-3 space-y-3">
              {PROVISION_INSIGHTS.map((insight) => (
                <div
                  key={insight.id}
                  className="border-border/50 bg-background/60 flex flex-col gap-2 rounded-lg border p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: insight.accent }}
                        aria-hidden="true"
                      />
                      <p className="text-sm font-medium">{insight.title}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {insight.metric}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {insight.description}
                  </p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "w-fit text-[10px] uppercase tracking-wide",
                      insight.badgeClassName,
                    )}
                  >
                    {insight.impact}
                  </Badge>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="actions" className="mt-3 space-y-3">
              {PROVISION_ACTIONS.map((action) => (
                <div
                  key={action.id}
                  className="border-border/50 bg-muted/30 flex flex-col gap-3 rounded-lg border p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "inline-flex size-9 items-center justify-center rounded-lg",
                          action.accentClassName,
                        )}
                        aria-hidden="true"
                      >
                        {action.icon}
                      </span>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium">{action.title}</p>
                        <p className="text-xs text-muted-foreground leading-snug">
                          {action.description}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Sparkles className="size-4" />}
                    >
                      {action.cta}
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </GlowCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-7">
        <GlowCard
          className="xl:col-span-4"
          title="Agenda inteligente"
          description="Visualize checkpoints, previsões automáticas e reuniões decisivas."
          contentClassName="gap-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-dashed">
              {selectedMonthLabel}
            </Badge>
            <Badge
              variant="secondary"
              className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
            >
              3 sugestões de IA nesta semana
            </Badge>
          </div>
          <EventCalendar
            events={calendarEvents}
            initialView="agenda"
            className="rounded-lg border-0 bg-transparent"
          />
        </GlowCard>

        <GlowCard
          className="xl:col-span-3"
          title="Atenção imediata"
          description="Trilhas que precisam de replanejamento para manter a cadência."
          contentClassName="gap-4"
        >
          <div className="space-y-3">
            {listError ? (
              <p className="text-muted-foreground text-sm">
                Não foi possível carregar as provisões do período.
              </p>
            ) : isListLoading ? (
              <p className="text-muted-foreground text-sm">
                Carregando alertas de provisões...
              </p>
            ) : atRiskRecords.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Tudo em dia! Nenhum alerta crítico no período.
              </p>
            ) : (
              atRiskRecords.map((record) => {
                const coverage = Math.min(130, Math.round(record.coverage));
                const riskConfig = RISK_CONFIG[record.risk];
                const periodLabel = capitalize(
                  monthFormatter.format(new Date(record.year, record.month, 1)),
                );

                return (
                  <div
                    key={record.id}
                    className="border-border/50 bg-rose-500/5 flex flex-col gap-3 rounded-lg border p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: record.category.color }}
                          aria-hidden="true"
                        />
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-semibold">
                            {record.category.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {periodLabel} de {record.year}
                          </p>
                        </div>
                      </div>
                      <Badge className={riskConfig.className}>
                        {riskConfig.label}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Cobertura de {Math.round(record.coverage)}%</span>
                      <span>
                        Variância {record.variance >= 0 ? "+" : ""}
                        {formatCurrency(record.variance)}
                      </span>
                    </div>
                    <div className="bg-muted relative h-2 w-full overflow-hidden rounded-full">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          width: `${coverage}%`,
                          backgroundColor: record.category.color,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">
                      Atualizado em{" "}
                      {new Date(record.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </GlowCard>
      </section>

      <section>
        <GlowCard
          title="Mapa detalhado de provisões"
          description="Acompanhe valores planejados, comprometidos e o status de cada categoria."
          contentClassName="gap-6"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Período</TableHead>
                <TableHead className="text-right">Planejado</TableHead>
                <TableHead className="text-right">Comprometido</TableHead>
                <TableHead className="text-right">Variação</TableHead>
                <TableHead className="min-w-[180px]">Cobertura</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listError ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="text-muted-foreground text-sm">
                      Não foi possível carregar os registros de provisão.
                    </div>
                  </TableCell>
                </TableRow>
              ) : isListLoading ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="text-muted-foreground text-sm">
                      Carregando provisões cadastradas...
                    </div>
                  </TableCell>
                </TableRow>
              ) : provisionsList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="text-muted-foreground text-sm">
                      Nenhuma provisão cadastrada para o período selecionado.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                provisionsList.map((record) => {
                  const coveragePercent = Math.round(record.coverage);
                  const periodLabel = capitalize(
                    monthFormatter.format(
                      new Date(record.year, record.month, 1),
                    ),
                  );
                  const riskConfig = RISK_CONFIG[record.risk];

                  return (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <span
                            className="mt-1 size-2.5 rounded-full"
                            style={{ backgroundColor: record.category.color }}
                          />
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-foreground">
                              {record.category.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Atualizado em{" "}
                              {new Date(record.createdAt).toLocaleDateString(
                                "pt-BR",
                              )}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-dashed">
                          {periodLabel} de {record.year}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(record.plannedAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(record.committedAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "font-medium",
                            record.variance >= 0
                              ? "text-emerald-600 dark:text-emerald-300"
                              : "text-amber-600 dark:text-amber-300",
                          )}
                        >
                          {record.variance >= 0 ? "+" : ""}
                          {formatCurrency(record.variance)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1.5">
                          <div className="bg-muted relative h-2 w-full overflow-hidden rounded-full">
                            <div
                              className="absolute inset-y-0 left-0 rounded-full"
                              style={{
                                width: `${Math.min(120, coveragePercent)}%`,
                                backgroundColor: record.category.color,
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>{coveragePercent}% coberto</span>
                            <span>
                              Registrado em{" "}
                              {new Date(record.createdAt).toLocaleDateString(
                                "pt-BR",
                              )}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className={riskConfig.className}>
                          {riskConfig.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </GlowCard>
      </section>
    </div>
  );
}
