import {
  IconChecklist,
  IconCopy,
  IconTimelineEvent,
} from "@tabler/icons-react";
import { useMemo } from "react";

import { BreadcrumbComponent } from "@/components/Breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long" });

type MonthOption = {
  value: string;
  label: string;
};

type Period = {
  month: number;
  year: number;
};

export type QuickActionHandlers = {
  onSaveAll: () => void;
  onCopyPrevious: () => void;
  onApplyForward: () => void;
};

type ProvisioningHeaderProps = {
  isLoading?: boolean;
  groupName?: string;
  memberName?: string;
  periodLabel?: string;
  period: Period;
  availablePeriods?: Array<{
    month: number;
    year: number;
    label: string;
    key: string;
  }>;
  onPeriodChange: (period: Period) => void;
  quickActions: QuickActionHandlers;
  isSaving?: boolean;
  isCopying?: boolean;
  isApplying?: boolean;
  draftCount: number;
};

const buildMonthOptions = (): MonthOption[] =>
  Array.from({ length: 12 }, (_, index) => {
    const label = monthFormatter
      .format(new Date(2025, index, 1))
      .replace(/^\w/, (match) => match.toUpperCase());
    return {
      value: index.toString(),
      label,
    };
  });

const toStringMonth = (value: number) => value.toString();

const ensureYearOptions = (
  period: Period,
  availablePeriods?: Array<{ month: number; year: number }>,
) => {
  const currentYear = new Date().getFullYear();
  const years = new Set<number>([
    currentYear - 1,
    currentYear,
    currentYear + 1,
    period.year,
  ]);
  availablePeriods?.forEach((item) => {
    years.add(item.year);
  });
  return Array.from(years)
    .sort((a, b) => a - b)
    .map((year) => ({
      value: year.toString(),
      label: year.toString(),
    }));
};

export function ProvisioningHeader({
  isLoading,
  groupName,
  memberName,
  periodLabel,
  period,
  availablePeriods,
  onPeriodChange,
  quickActions,
  isSaving,
  isCopying,
  isApplying,
  draftCount,
}: ProvisioningHeaderProps) {
  const monthOptions = useMemo(buildMonthOptions, []);
  const yearOptions = useMemo(
    () => ensureYearOptions(period, availablePeriods),
    [availablePeriods, period],
  );

  const selectedMonth = toStringMonth(period.month);
  const selectedYear = period.year.toString();

  return (
    <header className="space-y-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <BreadcrumbComponent />
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              {isLoading ? (
                <>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-28" />
                </>
              ) : (
                <>
                  <span className="rounded-full border border-border px-2 py-1 font-medium text-xs">
                    {groupName ?? "Grupo financeiro"}
                  </span>
                  <span className="rounded-full border border-dashed border-border px-2 py-1 font-medium text-xs">
                    {periodLabel ?? "Selecionando período"}
                  </span>
                </>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Provisionamento
              </h1>
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? "Carregando contexto do grupo..."
                  : memberName
                    ? `Operado por ${memberName}`
                    : "Planeje e acompanhe provisões mensais."}
              </p>
            </div>
          </div>
        </div>
        <div className="grid w-full gap-3 sm:max-w-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="provisioning-month">Mês</Label>
              <Select
                value={selectedMonth}
                onValueChange={(value) =>
                  onPeriodChange({ month: Number(value), year: period.year })
                }
                disabled={isLoading}
              >
                <SelectTrigger id="provisioning-month" className="w-full">
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
            </div>
            <div className="space-y-1">
              <Label htmlFor="provisioning-year">Ano</Label>
              <Select
                value={selectedYear}
                onValueChange={(value) =>
                  onPeriodChange({ month: period.month, year: Number(value) })
                }
                disabled={isLoading}
              >
                <SelectTrigger id="provisioning-year" className="w-full">
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
          <Input
            readOnly
            value={periodLabel ?? ""}
            placeholder="Período selecionado"
            className={cn("text-sm", isLoading && "animate-pulse")}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={quickActions.onSaveAll}
          icon={<IconChecklist className="size-4" aria-hidden="true" />}
          isLoading={isSaving}
          disabled={draftCount === 0}
        >
          Salvar tudo
          {draftCount > 0 ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary-foreground">
              {draftCount}
            </span>
          ) : null}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={quickActions.onCopyPrevious}
          icon={<IconCopy className="size-4" aria-hidden="true" />}
          isLoading={isCopying}
        >
          Copiar do mês anterior
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={quickActions.onApplyForward}
          icon={<IconTimelineEvent className="size-4" aria-hidden="true" />}
          isLoading={isApplying}
        >
          Aplicar para X meses
        </Button>
      </div>
    </header>
  );
}
