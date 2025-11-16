"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";

import { GlowCard } from "@/components/gloweffect";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatCurrency } from "@/helpers/formatCurrency";
import { trpc } from "@/lib/trpc/client";

type PlannedCostVsActualCostChartProps = {
  period: { month: number; year: number };
  type: "expense" | "income";
};

export function PlannedCostVsActualCostChart({
  period,
  type,
}: PlannedCostVsActualCostChartProps) {
  const { t } = useTranslation("provisions");
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const { data, isLoading } = trpc.provisions.plannedVsActualChart.useQuery({
    period,
    type,
    limit: 8,
  });

  const chartData =
    data?.map((item) => ({
      categoryId: item.categoryId,
      label: item.name,
      planned: item.planned,
      realized: item.realized,
    })) ?? [];

  const activeData =
    activeIndex !== null ? (chartData[activeIndex] ?? null) : null;

  const chartConfig = React.useMemo(
    () =>
      ({
        planned: {
          label: t("charts.plannedVsActual.planned", {
            defaultValue: "Planejado",
          }),
          color: "var(--chart-1)",
        },
        realized: {
          label: t("charts.plannedVsActual.realized", {
            defaultValue: "Realizado",
          }),
          color: "var(--chart-2)",
        },
      }) satisfies ChartConfig,
    [t],
  );

  const title = t("charts.plannedVsActual.title", {
    defaultValue: "Planejado vs Realizado",
  });
  const description = t("charts.plannedVsActual.description", {
    defaultValue:
      "Comparativo das categorias principais no período selecionado",
  });
  const emptyLabel = t("charts.plannedVsActual.empty", {
    defaultValue: "Sem dados para exibir",
  });

  return (
    <GlowCard title={title} description={description}>
      <div className="flex flex-col gap-3">
        {activeData ? (
          <div className="text-sm text-muted-foreground">
            <strong className="text-foreground">{activeData.label}</strong> ·{" "}
            {t("charts.plannedVsActual.tooltip", {
              defaultValue: "Planejado: {{planned}} · Realizado: {{realized}}",
              planned: formatCurrency(activeData.planned),
              realized: formatCurrency(activeData.realized),
            })}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">
            {t("charts.plannedVsActual.hint", {
              defaultValue: "Passe o cursor para ver os valores detalhados",
            })}
          </span>
        )}

        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            {t("charts.loading", { defaultValue: "Carregando..." })}
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            {emptyLabel}
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[320px]">
            <BarChart
              accessibilityLayer
              data={chartData}
              onMouseLeave={() => setActiveIndex(null)}
              margin={{ top: 10, right: 10, bottom: 10, left: 20 }}
            >
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(Number(value))}
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
                          {chartConfig[name as keyof typeof chartConfig]
                            ?.label || name}
                        </div>

                        <div className="font-semibold">
                          {formatCurrency(Number(value))}
                        </div>
                      </div>
                    )}
                  />
                }
              />
              <Bar dataKey="planned" fill="var(--color-planned)" radius={4}>
                {chartData.map((_, index) => (
                  <Cell
                    key={`planned-${index}`}
                    fillOpacity={
                      activeIndex === null
                        ? 1
                        : activeIndex === index
                          ? 1
                          : 0.35
                    }
                    stroke={activeIndex === index ? "var(--color-planned)" : ""}
                    onMouseEnter={() => setActiveIndex(index)}
                    className="duration-200"
                  />
                ))}
              </Bar>
              <Bar dataKey="realized" fill="var(--color-realized)" radius={4}>
                {chartData.map((_, index) => (
                  <Cell
                    key={`realized-${index}`}
                    fillOpacity={
                      activeIndex === null
                        ? 1
                        : activeIndex === index
                          ? 1
                          : 0.35
                    }
                    stroke={
                      activeIndex === index ? "var(--color-realized)" : ""
                    }
                    onMouseEnter={() => setActiveIndex(index)}
                    className="duration-200"
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </div>
    </GlowCard>
  );
}
