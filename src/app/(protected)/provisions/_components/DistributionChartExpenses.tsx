"use client";

import * as React from "react";
import { Pie, PieChart } from "recharts";

import { GlowCard } from "@/components/gloweffect";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";

const data = [
  { id: "housing", label: "Moradia", value: 35 },
  { id: "groceries", label: "Mercado", value: 20 },
  { id: "transport", label: "Transporte", value: 15 },
  { id: "health", label: "Saúde", value: 10 },
  { id: "fun", label: "Lazer", value: 8 },
  { id: "others", label: "Outros", value: 12 },
];

const chartConfig = data.reduce<Record<string, { label: string }>>(
  (acc, item, index) => {
    acc[item.id] = {
      label: item.label,
      color: `var(--chart-${(index % 5) + 1})`,
    };
    return acc;
  },
  {},
) satisfies ChartConfig;

export function DistributionChartExpenses() {
  return (
    <GlowCard
      title="Distribuição de Despesas"
      description="Principais categorias do mês"
    >
      <ChartContainer config={chartConfig} className="h-64">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
          />
        </PieChart>
      </ChartContainer>
    </GlowCard>
  );
}
