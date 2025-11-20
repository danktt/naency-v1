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
  translate: (key: string, options?: Record<string, unknown>) => string;
  onBarHover: (index: number | null) => void;
  isLoading: boolean;
}

export function MonthlyTrendCard({
  data,
  highlightedEntry,
  patternId,
  chartConfig,
  axisFormatter,
  translate,
  onBarHover,
  isLoading,
}: MonthlyTrendCardProps) {
  const hasData = data.length > 0;

  return (
    <GlowCard
      title={translate("charts.monthly.title")}
      description={translate("charts.monthly.description")}
      hasAction={
        highlightedEntry ? (
          <div className="flex flex-col text-xs">
            <span className="font-bold text-foreground">
              {highlightedEntry.data.label}
            </span>
            <div className="flex items-center justify-between gap-1">
              <span className="text-muted-foreground">
                {translate("charts.monthly.legend.incomes")}
              </span>
              <span className="font-bold text-foreground">
                {formatCurrency(highlightedEntry.data.incomes)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-muted-foreground">
                {translate("charts.monthly.legend.expenses")}
              </span>
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
            margin={{ top: 10, right: 10, bottom: 10, left: 20 }}
          >
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill={`url(#${patternId})`}
            />
            <defs>
              <MonthlyTrendBackgroundPattern id={patternId} />
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
                              "--color-bg": `var(--color-${name})`,
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
              fill="var(--color-incomes)"
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
                      ? "var(--color-incomes)"
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
              fill="var(--color-expenses)"
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
                      ? "var(--color-expenses)"
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
            <EmptyTitle>{translate("charts.monthly.empty.title")}</EmptyTitle>
            <EmptyDescription>
              {translate("charts.monthly.empty.description")}
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
