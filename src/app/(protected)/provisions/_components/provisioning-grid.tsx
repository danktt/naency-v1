import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
  IconInfoCircle,
  IconMessageCircle,
} from "@tabler/icons-react";
import { useMemo } from "react";

import { Badge, CategoryBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency } from "@/helpers/formatCurrency";
import { cn } from "@/lib/utils";

type GridRow = {
  key: string;
  categoryId: string;
  name: string;
  path: string[];
  depth: number;
  type: "expense" | "income";
  isActive: boolean;
  planned: number;
  realized: number;
  difference: number;
  note: string | null;
  isEditable: boolean;
  updatedAt: string | null;
  color: string;
};

type DraftDictionary = Record<
  string,
  {
    plannedAmount: number;
    note?: string | null;
  }
>;

type Totals = {
  plannedTotal: number;
  realizedTotal: number;
  differenceTotal: number;
  usage: number;
};

const formatDifference = (value: number, type: "expense" | "income") => {
  if (type === "income") {
    return formatCurrency(value);
  }
  return formatCurrency(value);
};

const getDifferenceTone = (value: number, type: "expense" | "income") => {
  if (type === "income") {
    return value < 0 ? "text-warning" : "text-success";
  }
  if (value < 0) {
    return "text-destructive";
  }
  if (value === 0) {
    return "text-muted-foreground";
  }
  return "text-success";
};

const getUsageSignal = (
  planned: number,
  realized: number,
  type: "expense" | "income",
) => {
  if (planned === 0) {
    return "neutral";
  }
  const ratio = realized / planned;
  if (type === "income") {
    if (ratio >= 1) return "success";
    if (ratio >= 0.75) return "warning";
    return "neutral";
  }
  if (ratio > 1.05) return "danger";
  if (ratio > 0.85) return "warning";
  return "neutral";
};

const usageSignalClasses: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground",
  warning: "bg-warning/20 text-warning-foreground",
  danger: "bg-destructive/15 text-destructive",
  success: "bg-success/20 text-success-foreground",
};

const formatPath = (row: GridRow) => {
  if (row.depth === 0) {
    return row.name;
  }
  const parts = row.path.slice(0, -1);
  return `${parts.join(" › ")} › ${row.name}`;
};

type ProvisioningGridProps = {
  rows: GridRow[];
  isLoading?: boolean;
  drafts: DraftDictionary;
  selectedCategories: Set<string>;
  onToggleCategory: (categoryId: string) => void;
  onToggleAll: (categoryIds: string[]) => void;
  onChangeDraft: (categoryId: string, value: number | null | undefined) => void;
  onRequestNote?: (row: GridRow) => void;
  emptyMessage?: string;
};

export function ProvisioningSummary({
  totals,
  isLoading,
}: {
  totals: Totals;
  isLoading?: boolean;
}) {
  const usage = Number.isFinite(totals.usage) ? totals.usage : 0;
  const usageTone =
    usage >= 105
      ? "danger"
      : usage >= 90
        ? "warning"
        : usage <= 0
          ? "neutral"
          : "success";

  return (
    <section className="grid gap-4 md:grid-cols-4">
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Total planejado
        </p>
        <p className="mt-2 text-2xl font-semibold text-foreground">
          {isLoading ? "—" : formatCurrency(totals.plannedTotal)}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Total realizado
        </p>
        <p className="mt-2 text-2xl font-semibold text-foreground">
          {isLoading ? "—" : formatCurrency(totals.realizedTotal)}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Diferença
        </p>
        <p
          className={cn(
            "mt-2 text-2xl font-semibold",
            getDifferenceTone(totals.differenceTotal, "expense"),
          )}
        >
          {isLoading ? "—" : formatCurrency(totals.differenceTotal)}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            % do orçamento usado
          </p>
          <Badge variant="outline" className="gap-1 text-xs">
            {usage.toFixed(1)}%
            {usageTone === "danger" ? (
              <IconAlertTriangle className="size-3 text-destructive" />
            ) : usageTone === "warning" ? (
              <IconChevronUp className="size-3 text-warning-foreground" />
            ) : usageTone === "success" ? (
              <IconChevronDown className="size-3 text-success-foreground" />
            ) : null}
          </Badge>
        </div>
        <div className="mt-3 space-y-2">
          <Progress value={Math.min(usage, 150)} />
          <p className="text-[11px] text-muted-foreground">
            Valores acima de 100% indicam gasto acima do planejado.
          </p>
        </div>
      </div>
    </section>
  );
}

export function ProvisioningGrid({
  rows,
  isLoading,
  drafts,
  selectedCategories,
  onToggleCategory,
  onToggleAll,
  onChangeDraft,
  onRequestNote,
  emptyMessage = "Nenhuma categoria encontrada para o período.",
}: ProvisioningGridProps) {
  const resolvedRows = useMemo(() => {
    return rows.map((row) => {
      const draft = drafts[row.categoryId];
      const plannedValue =
        draft?.plannedAmount ?? Number(row.planned.toFixed(2));
      const difference = Number((plannedValue - row.realized).toFixed(2));
      return {
        ...row,
        plannedValue,
        difference,
      };
    });
  }, [rows, drafts]);

  const allIds = resolvedRows.map((row) => row.categoryId);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selectedCategories.has(id));
  const someSelected =
    allIds.length > 0 &&
    !allSelected &&
    allIds.some((id) => selectedCategories.has(id));

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="grid grid-cols-[40px_minmax(0,1.6fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(60px,0.6fr)] gap-3 border-b border-border bg-muted/50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <div className="flex items-center justify-center">
            <Checkbox
              checked={allSelected || (someSelected && "indeterminate")}
              onCheckedChange={() => onToggleAll(allIds)}
              aria-label="Selecionar todas as categorias"
              disabled={isLoading || resolvedRows.length === 0}
            />
          </div>
          <div className="flex items-center gap-2">Categoria</div>
          <div className="flex items-center justify-end">Planejado</div>
          <div className="flex items-center justify-end">Realizado</div>
          <div className="flex items-center justify-end">Diferença</div>
          <div className="flex items-center justify-center">Notas</div>
        </div>

        {isLoading ? (
          <div className="space-y-2 px-4 py-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`skeleton-${index.toString()}`}
                className="h-10 animate-pulse rounded-md bg-muted/60"
              />
            ))}
          </div>
        ) : resolvedRows.length === 0 ? (
          <div className="flex items-center justify-center px-6 py-10 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="divide-y divide-border/70">
            {resolvedRows.map((row) => {
              const isSelected = selectedCategories.has(row.categoryId);
              const usageSignal = getUsageSignal(
                row.plannedValue,
                row.realized,
                row.type,
              );
              const pathLabel = formatPath(row);

              return (
                <div
                  key={row.key}
                  className={cn(
                    "grid grid-cols-[40px_minmax(0,1.6fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(60px,0.6fr)] items-center gap-3 px-4 py-3 text-sm transition-colors",
                    !row.isActive && "bg-muted/30 text-muted-foreground",
                    isSelected && "bg-primary/5",
                  )}
                >
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleCategory(row.categoryId)}
                      aria-label={`Selecionar categoria ${row.name}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm font-medium text-foreground"
                        style={{ paddingLeft: `${row.depth * 12}px` }}
                      >
                        {row.name}
                      </span>
                      <CategoryBadge
                        color={row.color}
                        name={row.type === "expense" ? "Despesa" : "Receita"}
                        variant="muted"
                      />
                      {!row.isActive ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase"
                        >
                          Inativa
                        </Badge>
                      ) : null}
                    </div>
                    {row.depth > 0 ? (
                      <p className="text-[11px] text-muted-foreground">
                        {pathLabel}
                      </p>
                    ) : null}
                    <div
                      className={cn(
                        "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]",
                        usageSignalClasses[usageSignal],
                      )}
                    >
                      <span>
                        {formatCurrency(row.realized)} /{" "}
                        {formatCurrency(row.plannedValue)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={row.plannedValue}
                      min={0}
                      onChange={(event) =>
                        onChangeDraft(
                          row.categoryId,
                          event.target.value === ""
                            ? undefined
                            : Number(event.target.value),
                        )
                      }
                      disabled={!row.isEditable}
                      className={cn(
                        "h-9 w-full max-w-[160px] text-right",
                        !row.isEditable && "pointer-events-none opacity-70",
                      )}
                      aria-label={`Valor planejado para ${row.name}`}
                    />
                  </div>
                  <div className="flex flex-col items-end text-sm">
                    <span>{formatCurrency(row.realized)}</span>
                    {row.updatedAt ? (
                      <span className="text-[11px] text-muted-foreground">
                        Atualizado{" "}
                        {new Date(row.updatedAt).toLocaleDateString("pt-BR")}
                      </span>
                    ) : null}
                  </div>
                  <div
                    className={cn(
                      "flex flex-col items-end text-sm font-medium",
                      getDifferenceTone(row.difference, row.type),
                    )}
                  >
                    <span>{formatDifference(row.difference, row.type)}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {row.difference >= 0 ? "Disponível" : "Excedido"}
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => onRequestNote?.(row)}
                          className="size-8"
                        >
                          <IconMessageCircle className="size-4" />
                          <span className="sr-only">Abrir observações</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        {row.note
                          ? row.note
                          : "Adicionar observação ou opções avançadas"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <IconInfoCircle className="size-4" />
        Valores destacados em vermelho indicam que o gasto excedeu o planejado.
      </div>
    </section>
  );
}
