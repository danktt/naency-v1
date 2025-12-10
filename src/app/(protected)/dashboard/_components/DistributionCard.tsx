"use client";

import * as React from "react";
import { Cell, Label, Pie, PieChart, Sector } from "recharts";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";

import { GlowCard } from "@/components/gloweffect";
import {
  type ChartConfig,
  ChartContainer,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/helpers/formatCurrency";
import { getCategoryColor } from "@/helpers/getCategoryColor";

type DistributionItem = {
  id: string;
  label: string;
  value: number;
  color: string;
  percentage: number;
  parentId: string | null;
  parentName: string | null;
};

interface DistributionCardProps {
  data: DistributionItem[];
  chartConfig?: Record<string, { label: string; color: string }>;
  isLoading: boolean;
}

export function DistributionCard({ data, isLoading }: DistributionCardProps) {
  const id = "distribution-pie";

  // Agrupa por categoria pai
  const groupedByParent = React.useMemo(() => {
    const groups = new Map<string | null, DistributionItem[]>();

    data.forEach((item) => {
      const parentKey = item.parentId ?? "uncategorized";
      if (!groups.has(parentKey)) {
        groups.set(parentKey, []);
      }
      const group = groups.get(parentKey);
      if (group) {
        group.push(item);
      }
    });

    // Agrupa os itens por pai e soma os valores
    const parentGroups = new Map<
      string | null,
      { id: string; label: string; value: number; items: DistributionItem[] }
    >();

    groups.forEach((items, parentKey) => {
      const totalValue = items.reduce((sum, item) => sum + item.value, 0);

      // Se não tem parentId, usa o primeiro item como referência
      const firstItem = items[0];
      if (!firstItem) return;

      const label =
        parentKey === "uncategorized"
          ? "Sem categoria"
          : (firstItem.parentName ?? firstItem.label ?? "Sem categoria");

      parentGroups.set(parentKey, {
        id: parentKey ?? "uncategorized",
        label,
        value: totalValue,
        items,
      });
    });

    return Array.from(parentGroups.values());
  }, [data]);

  // Ordena por valor (maior para menor) e aplica cores
  const sortedParentGroups = React.useMemo(() => {
    const sorted = [...groupedByParent].sort((a, b) => b.value - a.value);
    return sorted.map((group, index) => ({
      ...group,
      color: getCategoryColor(index, sorted.length),
    }));
  }, [groupedByParent]);

  const [activeCategoryId, setActiveCategoryId] = React.useState<string | null>(
    sortedParentGroups[0]?.id ?? null,
  );

  const activeIndex = React.useMemo(
    () => sortedParentGroups.findIndex((item) => item.id === activeCategoryId),
    [activeCategoryId, sortedParentGroups],
  );

  const hasData = sortedParentGroups.length > 0;

  // Calcula o total para porcentagem
  const totalValue = React.useMemo(
    () => sortedParentGroups.reduce((sum, item) => sum + item.value, 0),
    [sortedParentGroups],
  );

  // Cria o chartConfig dinâmico
  const dynamicChartConfig = React.useMemo<ChartConfig>(() => {
    const config: ChartConfig = {};
    sortedParentGroups.forEach((group) => {
      config[group.id] = {
        label: group.label,
        color: group.color,
      };
    });
    return config;
  }, [sortedParentGroups]);

  return (
    <GlowCard
      title="Distribuição por categoria"
      description="Entenda para onde o dinheiro está indo neste mês."
      contentClassName="gap-6"
    >
      {isLoading ? (
        <Skeleton className="h-[320px] w-full" />
      ) : hasData ? (
        <div className="flex flex-col gap-6">
          <ChartStyle id={id} config={dynamicChartConfig} />
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <ChartContainer
              id={id}
              config={dynamicChartConfig}
              className="h-[320px] w-full max-w-xl"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => {
                        const percentage =
                          totalValue > 0
                            ? ((Number(value) / totalValue) * 100).toFixed(1)
                            : "0.0";

                        // O name é o id da categoria (nameKey="id")
                        const categoryData = sortedParentGroups.find(
                          (g) => g.id === name,
                        );
                        const color = categoryData?.color ?? "#9ca3af";
                        const label = categoryData?.label ?? "Sem categoria";

                        return (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="size-2.5 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                              <span className="font-medium">{label}</span>
                            </div>
                            <span className="font-medium">
                              {formatCurrency(Number(value))}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {percentage}% das despesas do mês
                            </span>
                          </div>
                        );
                      }}
                      nameKey="id"
                    />
                  }
                />
                <Pie
                  data={sortedParentGroups}
                  dataKey="value"
                  nameKey="id"
                  innerRadius={70}
                  outerRadius={120}
                  strokeWidth={4}
                  cornerRadius={8}
                  paddingAngle={2}
                  activeIndex={activeIndex}
                  activeShape={({
                    outerRadius = 0,
                    ...props
                  }: PieSectorDataItem) => (
                    <g>
                      <Sector
                        {...props}
                        outerRadius={outerRadius + 10}
                        cornerRadius={8}
                      />
                      {/* <Sector
                        {...props}
                        outerRadius={outerRadius + 25}
                        innerRadius={outerRadius + 12}
                        cornerRadius={8}
                      /> */}
                    </g>
                  )}
                >
                  {sortedParentGroups.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))}
                </Pie>
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      const activeGroup = sortedParentGroups[activeIndex];
                      if (!activeGroup) return null;

                      const percentage =
                        totalValue > 0
                          ? ((activeGroup.value / totalValue) * 100).toFixed(1)
                          : "0.0";

                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-3xl font-bold"
                          >
                            {formatCurrency(activeGroup.value)}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 24}
                            className="fill-muted-foreground text-sm"
                          >
                            {activeGroup.label}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 42}
                            className="fill-muted-foreground text-xs"
                          >
                            {percentage}%
                          </tspan>
                        </text>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ChartContainer>

            <div className="space-y-4 md:w-64">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Detalhe por categoria
                </h4>
                <Select
                  value={activeCategoryId ?? undefined}
                  onValueChange={(value) => setActiveCategoryId(value)}
                >
                  <SelectTrigger
                    className="h-7 w-[180px] rounded-lg"
                    aria-label="Selecione uma categoria"
                  >
                    <SelectValue placeholder="Selecione categoria" />
                  </SelectTrigger>
                  <SelectContent align="end" className="rounded-xl">
                    {sortedParentGroups.map((group) => {
                      const config = dynamicChartConfig[group.id];
                      if (!config) return null;

                      return (
                        <SelectItem
                          key={group.id}
                          value={group.id}
                          className="rounded-lg [&_span]:flex"
                        >
                          <div className="flex items-center gap-2 text-xs">
                            <span
                              className="flex h-3 w-3 shrink-0 rounded-xs"
                              style={{
                                backgroundColor: group.color,
                              }}
                            />
                            {config.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <ul className="space-y-3">
                {sortedParentGroups.map((item) => {
                  const percentage =
                    totalValue > 0
                      ? ((item.value / totalValue) * 100).toFixed(1)
                      : "0.0";
                  return (
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
                      <span className="font-medium">{percentage}%</span>
                    </li>
                  );
                })}
              </ul>
            </div>
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
