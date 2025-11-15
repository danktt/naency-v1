"use client";

import { Tab, Tabs } from "@heroui/tabs";
import {
  Icon12Hours,
  IconAlertTriangle,
  IconChartBar,
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconCurrencyDollar,
  IconWallet,
} from "@tabler/icons-react";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { GlowCard, GridItem } from "@/components/gloweffect";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/helpers/formatCurrency";
import { formatDateRange } from "@/helpers/formatDate";
import { trpc } from "@/lib/trpc/client";

import { CategoryRow } from "./_components/CategoryRow";

type MetricKey =
  | "plannedTotal"
  | "realizedTotal"
  | "remainingTotal"
  | "coverage"
  | "overBudgetTotal";

type MetricConfig = {
  key: MetricKey;
  titleKey: string;
  changeKey: string;
  icon: typeof IconCurrencyDollar;
  format: "currency" | "percentage";
};

type CopyFormValues = {
  month: string;
  year: string;
  overwrite: boolean;
};

const metricConfigs: MetricConfig[] = [
  {
    key: "plannedTotal",
    titleKey: "metrics.plannedTotal.title",
    changeKey: "metrics.plannedTotal.change",
    icon: IconCurrencyDollar,
    format: "currency",
  },
  {
    key: "realizedTotal",
    titleKey: "metrics.realizedTotal.title",
    changeKey: "metrics.realizedTotal.change",
    icon: IconWallet,
    format: "currency",
  },
  {
    key: "remainingTotal",
    titleKey: "metrics.remainingTotal.title",
    changeKey: "metrics.remainingTotal.change",
    icon: IconChartBar,
    format: "currency",
  },
  {
    key: "coverage",
    titleKey: "metrics.coverage.title",
    changeKey: "metrics.coverage.change",
    icon: Icon12Hours,
    format: "percentage",
  },
  {
    key: "overBudgetTotal",
    titleKey: "metrics.overBudgetTotal.title",
    changeKey: "metrics.overBudgetTotal.change",
    icon: IconWallet,
    format: "currency",
  },
];

const formatPercentage = (value: number) =>
  `${new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)}%`;

type TreeNode = {
  id: string;
  categoryId: string;
  name: string;
  color?: string | null;
  type: "expense" | "income";
  planned: number;
  realized: number;
  parentId: string | null;
  children: TreeNode[];
};

export default function ProvisionsPage() {
  const { t, i18n } = useTranslation("provisions");
  const [isMounted, setIsMounted] = React.useState(false);
  const utils = trpc.useUtils();

  const [selectedPeriod, setSelectedPeriod] = React.useState(() => {
    const today = new Date();
    return { month: today.getMonth(), year: today.getFullYear() };
  });
  const [selectedType, setSelectedType] = React.useState<"expense" | "income">(
    "expense",
  );
  const [expandedCategories, setExpandedCategories] = React.useState<
    Set<string>
  >(new Set());
  const [updatingCategoryId, setUpdatingCategoryId] = React.useState<
    string | null
  >(null);
  const [isCopyDialogOpen, setCopyDialogOpen] = React.useState(false);
  const [targetHasData, setTargetHasData] = React.useState(false);
  const copyForm = useForm<CopyFormValues>({
    defaultValues: {
      month: String(selectedPeriod.month),
      year: String(selectedPeriod.year),
      overwrite: false,
    },
  });

  const watchedMonth = copyForm.watch("month");
  const watchedYear = copyForm.watch("year");

  React.useEffect(() => {
    setTargetHasData(false);
    copyForm.clearErrors("overwrite");
  }, [watchedMonth, watchedYear, copyForm]);

  React.useEffect(() => {
    if (isCopyDialogOpen) return;
    copyForm.reset({
      month: String(selectedPeriod.month),
      year: String(selectedPeriod.year),
      overwrite: false,
    });
    setTargetHasData(false);
  }, [isCopyDialogOpen, selectedPeriod.month, selectedPeriod.year, copyForm]);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const fallbackLng =
    (Array.isArray(i18n.options?.fallbackLng) && i18n.options.fallbackLng[0]) ||
    (typeof i18n.options?.fallbackLng === "string"
      ? i18n.options.fallbackLng
      : "en");

  const fallbackT = React.useMemo(
    () => i18n.getFixedT(fallbackLng, "provisions"),
    [i18n, fallbackLng],
  );

  const translate = isMounted ? t : fallbackT;

  const periodInput = React.useMemo(
    () => ({
      month: selectedPeriod.month,
      year: selectedPeriod.year,
    }),
    [selectedPeriod.month, selectedPeriod.year],
  );

  const gridInput = React.useMemo(
    () => ({
      period: periodInput,
    }),
    [periodInput],
  );

  const {
    data: metricsData,
    isLoading: isMetricsLoading,
    isError: isMetricsError,
  } = trpc.provisions.metrics.useQuery(periodInput);

  const {
    data: gridData,
    isLoading: isGridLoading,
    isError: isGridError,
  } = trpc.provisions.grid.useQuery(gridInput);

  const bulkUpsertMutation = trpc.provisions.bulkUpsert.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.provisions.grid.invalidate(gridInput),
        utils.provisions.metrics.invalidate(periodInput),
      ]);
    },
  });

  const copyMutation = trpc.provisions.copyFromPrevious.useMutation({
    onSuccess: async (_data, variables) => {
      toast.success(translate("toasts.copySuccess"));
      await Promise.all([
        utils.provisions.grid.invalidate(gridInput),
        utils.provisions.grid.invalidate({ period: variables.to }),
        utils.provisions.metrics.invalidate(variables.to),
      ]);
    },
    onError: () => {
      toast.error(translate("toasts.copyError"));
    },
  });

  const totalsByKey: Record<MetricKey, number> = React.useMemo(
    () => ({
      plannedTotal: metricsData?.plannedTotal ?? 0,
      realizedTotal: metricsData?.realizedTotal ?? 0,
      remainingTotal: metricsData?.remainingTotal ?? 0,
      coverage: metricsData?.coverage ?? 0,
      overBudgetTotal: metricsData?.overBudgetTotal ?? 0,
    }),
    [
      metricsData?.coverage,
      metricsData?.overBudgetTotal,
      metricsData?.plannedTotal,
      metricsData?.realizedTotal,
      metricsData?.remainingTotal,
    ],
  );

  const getFormattedValue = React.useCallback(
    (config: MetricConfig) => {
      return config.format === "percentage"
        ? formatPercentage(totalsByKey[config.key])
        : formatCurrency(totalsByKey[config.key]);
    },
    [totalsByKey],
  );

  const getLocale = React.useCallback(() => {
    const lang = (isMounted ? i18n.language : fallbackLng) ?? "en";
    return lang.startsWith("pt") ? "pt-BR" : "en-US";
  }, [i18n.language, fallbackLng, isMounted]);

  const monthOptions = React.useMemo(() => {
    const locale = getLocale();
    return Array.from({ length: 12 }).map((_, month) => {
      const date = new Date(2024, month, 1);
      const label = new Intl.DateTimeFormat(locale, { month: "long" }).format(
        date,
      );
      return {
        value: String(month),
        label: `${label.charAt(0).toUpperCase()}${label.slice(1)}`,
      };
    });
  }, [getLocale]);

  const yearOptions = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }).map((_, index) => {
      const year = currentYear - 2 + index;
      return { value: String(year), label: String(year) };
    });
  }, []);
  const getDescription = React.useCallback(
    (config: MetricConfig) => {
      if (isMetricsLoading && !metricsData) {
        return translate("metrics.loadingDescription");
      }
      if (isMetricsError) {
        return translate("metrics.errorDescription");
      }
      const formattedValue =
        config.format === "percentage"
          ? formatPercentage(totalsByKey[config.key])
          : formatCurrency(totalsByKey[config.key]);
      return translate(config.changeKey, { value: formattedValue });
    },
    [isMetricsError, isMetricsLoading, metricsData, totalsByKey, translate],
  );

  const checkTargetHasData = React.useCallback(
    async (target: { month: number; year: number }) => {
      try {
        const data = await utils.provisions.grid.fetch({ period: target });
        if (!data?.rows?.length) {
          return false;
        }
        return data.rows.some((row) => row.planned !== 0);
      } catch {
        return false;
      }
    },
    [utils.provisions.grid],
  );

  const categoryTree = React.useMemo<TreeNode[]>(() => {
    if (!gridData?.rows?.length) {
      return [];
    }

    const nodes = new Map<string, TreeNode>();

    gridData.rows.forEach((row) => {
      nodes.set(row.categoryId, {
        id: row.id,
        categoryId: row.categoryId,
        name: row.name,
        color: row.color,
        type: row.type,
        planned: row.planned,
        realized: row.realized,
        parentId: row.parentId,
        children: [],
      });
    });

    const roots: TreeNode[] = [];
    nodes.forEach((node) => {
      if (node.parentId && nodes.has(node.parentId)) {
        nodes.get(node.parentId)?.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [gridData?.rows]);

  const filteredTree = React.useMemo(() => {
    if (!categoryTree.length) {
      return [];
    }

    return categoryTree.filter((node) => node.type === selectedType);
  }, [categoryTree, selectedType]);

  const toggleCategory = React.useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const updateCategoryPlanned = React.useCallback(
    async (categoryId: string, plannedAmount: number) => {
      try {
        setUpdatingCategoryId(categoryId);
        await bulkUpsertMutation.mutateAsync({
          period: periodInput,
          entries: [
            {
              categoryId,
              plannedAmount,
            },
          ],
        });
        toast.success(translate("toasts.plannedUpdateSuccess"));
      } catch (error) {
        toast.error(translate("toasts.plannedUpdateError"));
        throw error;
      } finally {
        setUpdatingCategoryId((current) =>
          current === categoryId ? null : current,
        );
      }
    },
    [bulkUpsertMutation, periodInput, translate],
  );

  const selectedPeriodLabel = React.useMemo(() => {
    const reference = new Date(selectedPeriod.year, selectedPeriod.month, 1);
    return formatDateRange({
      fromInput: reference,
      toInput: reference,
      locale: getLocale(),
    });
  }, [selectedPeriod.month, selectedPeriod.year, getLocale]);

  const goToPreviousMonth = React.useCallback(() => {
    setSelectedPeriod((prev) => {
      const date = new Date(prev.year, prev.month - 1, 1);
      return { month: date.getMonth(), year: date.getFullYear() };
    });
  }, []);

  const goToNextMonth = React.useCallback(() => {
    setSelectedPeriod((prev) => {
      const date = new Date(prev.year, prev.month + 1, 1);
      return { month: date.getMonth(), year: date.getFullYear() };
    });
  }, []);

  const handleCopySubmit = copyForm.handleSubmit(async (values) => {
    const targetPeriod = {
      month: Number(values.month),
      year: Number(values.year),
    };
    try {
      const hasData = await checkTargetHasData(targetPeriod);
      setTargetHasData(hasData);
      if (hasData && !values.overwrite) {
        copyForm.setError("overwrite", {
          type: "manual",
          message: translate("copyDialog.overwriteWarning"),
        });
        return;
      }
      copyForm.clearErrors("overwrite");
      await copyMutation.mutateAsync({
        from: periodInput,
        to: targetPeriod,
        overwrite: values.overwrite,
      });
      setCopyDialogOpen(false);
    } catch {
      // Errors handled via mutation toasts
    }
  });

  const renderTree = (nodes: TreeNode[]) =>
    nodes.map((node) => (
      <div key={node.categoryId} className="space-y-2">
        <CategoryRow
          category={{
            id: node.categoryId,
            name: node.name,
            icon: node.name.charAt(0).toUpperCase(),
            color: node.color ?? "#c9c9c9",
            type: node.type,
            planned: node.planned,
            spent: node.realized,
          }}
          onUpdatePlanned={(value) =>
            updateCategoryPlanned(node.categoryId, value)
          }
          hasChildren={node.children.length > 0}
          isExpanded={expandedCategories.has(node.categoryId)}
          onToggle={
            node.children.length
              ? () => toggleCategory(node.categoryId)
              : undefined
          }
          isParent={node.children.length > 0}
          isUpdating={updatingCategoryId === node.categoryId}
        />
        {node.children.length > 0 &&
          expandedCategories.has(node.categoryId) && (
            <div className="ml-6 space-y-2 border-l-2 border-border pl-4">
              {renderTree(node.children)}
            </div>
          )}
      </div>
    ));

  const isEmptyState = !filteredTree.length && !isGridLoading && !isGridError;

  return (
    <div className="space-y-8">
      <section className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            {translate("header.title")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {translate("header.subtitle")}
          </p>
        </div>
        <Dialog open={isCopyDialogOpen} onOpenChange={setCopyDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary">
              <IconCopy stroke={1.5} />
              {translate("header.copyButtonTitle")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{translate("copyDialog.title")}</DialogTitle>
              <DialogDescription>
                {translate("copyDialog.description", {
                  monthLabel: selectedPeriodLabel,
                })}
              </DialogDescription>
            </DialogHeader>
            <Form {...copyForm}>
              <form onSubmit={handleCopySubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={copyForm.control}
                    name="month"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {translate("copyDialog.targetMonthLabel")}
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {monthOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={copyForm.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {translate("copyDialog.targetYearLabel")}
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {yearOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={copyForm.control}
                  name="overwrite"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(Boolean(checked));
                              copyForm.clearErrors("overwrite");
                            }}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            {translate("copyDialog.overwriteLabel")}
                          </FormLabel>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {targetHasData ? (
                  <Alert variant="destructive">
                    <IconAlertTriangle className="text-destructive" />
                    <AlertTitle>
                      {translate("copyDialog.overwriteLabel")}
                    </AlertTitle>
                    <AlertDescription>
                      {translate("copyDialog.overwriteWarning")}
                    </AlertDescription>
                  </Alert>
                ) : null}

                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setCopyDialogOpen(false)}
                    disabled={copyMutation.isPending}
                  >
                    {translate("copyDialog.cancel")}
                  </Button>
                  <Button type="submit" disabled={copyMutation.isPending}>
                    {copyMutation.isPending
                      ? t("rowActions.saving")
                      : translate("copyDialog.submit")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </section>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {metricConfigs.map((metric) => {
          const Icon = metric.icon;
          return (
            <GridItem
              key={metric.key}
              icon={
                <Icon
                  className="size-5 text-black dark:text-neutral-400"
                  stroke={1.5}
                />
              }
              title={translate(metric.titleKey)}
              value={getFormattedValue(metric)}
              description={getDescription(metric)}
              isLoading={isMetricsLoading}
            />
          );
        })}
      </ul>

      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Tabs
            aria-label="Provisions type"
            selectedKey={selectedType}
            onSelectionChange={(key) =>
              setSelectedType(key as "expense" | "income")
            }
          >
            <Tab key="expense" title={translate("metrics.tabs.expenses")} />
            <Tab key="income" title={translate("metrics.tabs.incomes")} />
          </Tabs>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={goToPreviousMonth}
            >
              <IconChevronLeft stroke={1.5} />
            </Button>
            <div className="min-w-[200px] text-center">
              <p className="text-sm font-semibold capitalize text-foreground">
                {selectedPeriodLabel}
              </p>
            </div>
            <Button variant="secondary" size="icon-sm" onClick={goToNextMonth}>
              <IconChevronRight stroke={1.5} />
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-7">
          <GlowCard
            className="lg:col-span-7"
            title={translate("charts.monthly.title")}
            description={translate("charts.monthly.description")}
            contentClassName="gap-6"
          >
            {isGridLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`provisions-skeleton-${index}`}
                    className="h-24 animate-pulse rounded-lg bg-muted/60"
                  />
                ))}
              </div>
            ) : isGridError ? (
              <div className="py-12 text-center text-muted-foreground">
                {translate("charts.monthly.error")}
              </div>
            ) : isEmptyState ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">
                  {translate("charts.monthly.empty")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">{renderTree(filteredTree)}</div>
            )}
          </GlowCard>
        </div>
      </section>
    </div>
  );
}
