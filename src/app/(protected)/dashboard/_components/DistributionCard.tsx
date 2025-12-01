"use client";

import * as React from "react";
import { Cell, Pie, PieChart } from "recharts";

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

type DistributionItem = {
  id: string;
  label: string;
  value: number;
  color: string;
  percentage: number;
};

interface DistributionCardProps {
  data: DistributionItem[];
  chartConfig: Record<string, { label: string; color: string }>;
  isLoading: boolean;
}

export function DistributionCard({
  data,
  chartConfig,
  isLoading,
}: DistributionCardProps) {
  const hasData = data.length > 0;

  return (
    <GlowCard
      title="Distribuição por categoria"
      description="Entenda para onde o dinheiro está indo neste mês."
      contentClassName="gap-6"
    >
      {isLoading ? (
        <Skeleton className="h-[320px] w-full" />
      ) : hasData ? (
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <ChartContainer
            className="h-[320px] w-full max-w-xl"
            config={chartConfig}
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
                        typeof payloadWithPercentage?.percentage === "number"
                          ? payloadWithPercentage.percentage
                          : undefined;

                      return (
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {formatCurrency(Number(value))}
                          </span>
                          {percentage !== undefined ? (
                            <span className="text-muted-foreground text-xs">
                              {percentage.toFixed(1)}% das despesas do mês
                            </span>
                          ) : null}
                        </div>
                      );
                    }}
                  />
                }
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius={70}
                outerRadius={120}
                strokeWidth={4}
              >
                {data.map((entry) => (
                  <Cell key={entry.id} fill={entry.color} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent />} />
            </PieChart>
          </ChartContainer>
          <div className="space-y-4 md:w-64">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Detalhe por categoria
            </h4>
            <ul className="space-y-3">
              {data.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground">{item.label}</span>
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
            <EmptyTitle>Nenhuma despesa registrada</EmptyTitle>
            <EmptyDescription>
              Adicione despesas para ver a distribuição por categoria.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </GlowCard>
  );
}
