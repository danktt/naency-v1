"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import { GlowCard } from "@/components/gloweffect";
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

type MonthlyTrendEntry = {
  label: string;
  incomes: number;
  expenses: number;
};

type HighlightedEntry = {
  index: number;
  data: MonthlyTrendEntry;
} | null;

interface MonthlyTrendCardProps {
  data: MonthlyTrendEntry[];
  highlightedEntry: HighlightedEntry;
  patternId: string;
  chartConfig: Record<string, { label: string; color: string }>;
  axisFormatter: Intl.NumberFormat;
  onBarHover: (index: number | null) => void;
  isLoading: boolean;
}

export function MonthlyTrendCard({
  data,
  highlightedEntry,
  patternId,
  chartConfig,
  axisFormatter,
  onBarHover,
  isLoading,
}: MonthlyTrendCardProps) {
  const hasData = data.length > 0;

  return (
    <GlowCard
      title="Evolução mensal"
      description="Compare receitas e despesas mês a mês."
      hasAction={
        highlightedEntry ? (
          <div className="flex flex-col text-xs">
            <span className="font-bold text-foreground">
              {highlightedEntry.data.label}
            </span>
            <div className="flex items-center justify-between gap-1">
              <span className="text-muted-foreground">Receitas</span>
              <span className="font-bold text-foreground">
                {formatCurrency(highlightedEntry.data.incomes)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-muted-foreground">Despesas</span>
              <span className="font-bold text-foreground">
                {formatCurrency(highlightedEntry.data.expenses)}
              </span>
            </div>
          </div>
        ) : null
      }
    >
      {isLoading ? (
        <Skeleton className="h-[320px] w-full" />
      ) : hasData ? (
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={data}
            onMouseLeave={() => onBarHover(null)}
          >
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill={`url(#${patternId})`}
            />

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
              tickFormatter={(value) => axisFormatter.format(Number(value))}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="line"
                  formatter={(value, name, item, index) => (
                    <div className="flex items-center justify-between w-40">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <div
                          className="h-2.5 w-1 shrink-0 rounded-[2px] bg-(--color-bg)"
                          style={
                            {
                              "--color-bg":
                                name === "incomes"
                                  ? "var(--color-text-positive)"
                                  : "var(--color-text-negative)",
                            } as React.CSSProperties
                          }
                        />
                        {chartConfig[name as keyof typeof chartConfig]?.label ||
                          name}
                      </div>

                      <div className="font-semibold">
                        {formatCurrency(Number(value))}
                      </div>
                    </div>
                  )}
                />
              }
            />
            <Bar
              dataKey="incomes"
              fill="var(--color-text-positive)"
              radius={6}
              maxBarSize={48}
            >
              {data.map((_, index) => (
                <Cell
                  key={`monthly-incomes-${index}`}
                  fillOpacity={
                    highlightedEntry && highlightedEntry.index !== index
                      ? 0.35
                      : 1
                  }
                  stroke={
                    highlightedEntry?.index === index
                      ? "var(--color-text-positive)"
                      : undefined
                  }
                  strokeWidth={highlightedEntry?.index === index ? 1.5 : 0}
                  className="cursor-pointer transition-all duration-200 ease-out"
                  onMouseEnter={() => onBarHover(index)}
                />
              ))}
            </Bar>
            <Bar
              dataKey="expenses"
              fill="var(--color-text-negative)"
              radius={6}
              maxBarSize={48}
            >
              {data.map((_, index) => (
                <Cell
                  key={`monthly-expenses-${index}`}
                  fillOpacity={
                    highlightedEntry && highlightedEntry.index !== index
                      ? 0.35
                      : 1
                  }
                  stroke={
                    highlightedEntry?.index === index
                      ? "var(--color-text-negative)"
                      : undefined
                  }
                  strokeWidth={highlightedEntry?.index === index ? 1.5 : 0}
                  className="cursor-pointer transition-all duration-200 ease-out"
                  onMouseEnter={() => onBarHover(index)}
                />
              ))}
            </Bar>
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      ) : (
        <Empty className="h-[320px]">
          <EmptyHeader>
            <EmptyTitle>Sem histórico ainda</EmptyTitle>
            <EmptyDescription>
              Cadastre transações para visualizar a tendência mensal.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </GlowCard>
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
