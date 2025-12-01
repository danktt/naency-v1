"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { Pie, PieChart } from "recharts";

import { GlowCard } from "@/components/gloweffect";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
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

type DistributionChartExpensesProps = {
  period: { month: number; year: number };
  type: "expense" | "income";
};

export function DistributionChartExpenses({
  period,
  type,
}: DistributionChartExpensesProps) {
  const { t } = useTranslation("provisions");

  const { data, isLoading } = trpc.provisions.expenseDistribution.useQuery({
    period,
    type,
    limit: 10,
  });

  const chartData = React.useMemo(() => {
    if (!data?.length) {
      return [];
    }

    return data.map((item) => ({
      category: item.label,
      visitors: item.value,
      fill: item.color,
      percentage: item.percentage,
    }));
  }, [data]);

  const chartConfig = React.useMemo<ChartConfig>(() => {
    if (!data?.length) {
      return {};
    }

    return data.reduce<Record<string, { label: string; color: string }>>(
      (acc, item) => {
        acc[item.categoryId] = {
          label: item.label,
          color: item.color,
        };
        return acc;
      },
      {},
    );
  }, [data]);

  const title = t("charts.distribution.title", {
    defaultValue: "Distribuição de Despesas",
  });
  const description = t("charts.distribution.description", {
    defaultValue: "Principais categorias realizadas no período",
  });

  const isLoadingState = isLoading && !data;
  const hasData = chartData.length > 0;

  return (
    <GlowCard
      title={title}
      description={description}
      contentClassName="flex flex-col"
    >
      {isLoadingState ? (
        <Skeleton className="aspect-square max-h-[250px] w-full" />
      ) : hasData ? (
        <>
          <div className="flex-1 pb-0">
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-[250px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, _name, item) => {
                        const itemWithPercentage = item?.payload as {
                          percentage?: number;
                        };
                        const percentage =
                          typeof itemWithPercentage?.percentage === "number"
                            ? itemWithPercentage.percentage
                            : undefined;

                        return (
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {formatCurrency(Number(value))}
                            </span>
                            {percentage !== undefined ? (
                              <span className="text-muted-foreground text-xs">
                                {t("charts.distribution.tooltip.percentage", {
                                  defaultValue: "{{value}}% do total",
                                  value: percentage.toFixed(1),
                                })}
                              </span>
                            ) : null}
                          </div>
                        );
                      }}
                    />
                  }
                />
                <Pie
                  data={chartData}
                  dataKey="visitors"
                  nameKey="category"
                  innerRadius={60}
                  paddingAngle={2}
                  cornerRadius={6}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </div>
        </>
      ) : (
        <Empty className="aspect-square max-h-[250px] w-full">
          <EmptyHeader>
            <EmptyTitle>
              {t("charts.distribution.empty.title", {
                defaultValue: "Sem dados",
              })}
            </EmptyTitle>
            <EmptyDescription>
              {t("charts.distribution.empty.description", {
                defaultValue:
                  "Não há despesas realizadas neste período para exibir.",
              })}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </GlowCard>
  );
}
