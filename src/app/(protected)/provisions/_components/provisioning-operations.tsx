"use client";

import {
  IconAdjustmentsAlt,
  IconArchive,
  IconArchiveOff,
  IconClipboardCopy,
  IconDatabaseExport,
  IconHistory,
  IconLayoutGridAdd,
  IconRobot,
} from "@tabler/icons-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/helpers/formatCurrency";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

type Period = {
  month: number;
  year: number;
};

type GridRowSummary = {
  categoryId: string;
  name: string;
  type: "expense" | "income";
  planned: number;
  realized: number;
  note: string | null;
  depth: number;
  color: string;
};

type ProvisioningOperationsPanelProps = {
  period: Period;
  rows: GridRowSummary[];
  selectedCategoryIds: string[];
  onRefetch: () => Promise<void> | void;
};

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long" });

const formatPeriodLabel = (month: number, year: number) => {
  const reference = new Date(year, month, 1);
  const label = monthFormatter.format(reference);
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} de ${year}`;
};

const getPreviousPeriod = (period: Period) => {
  let month = period.month - 1;
  let year = period.year;
  if (month < 0) {
    month = 11;
    year -= 1;
  }
  return { month, year };
};

const parseCsvAmount = (value: string) => {
  if (!value) return 0;
  const sanitized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(sanitized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeCsvString = (value: string | undefined) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

export function ProvisioningOperationsPanel({
  period,
  rows,
  selectedCategoryIds,
  onRefetch,
}: ProvisioningOperationsPanelProps) {
  const rowMap = useMemo(
    () => new Map(rows.map((row) => [row.categoryId, row])),
    [rows],
  );
  const selectedRows = useMemo(
    () =>
      selectedCategoryIds
        .map((id) => rowMap.get(id))
        .filter(Boolean) as GridRowSummary[],
    [rowMap, selectedCategoryIds],
  );
  const selectionCount = selectedRows.length;

  const previousPeriod = useMemo(
    () => getPreviousPeriod(period),
    [period.month, period.year],
  );

  const [isSetValueOpen, setIsSetValueOpen] = useState(false);
  const [setValueMode, setSetValueMode] = useState<"absolute" | "relative">(
    "absolute",
  );
  const [setValueAmount, setSetValueAmount] = useState("0");
  const [setValueNote, setSetValueNote] = useState("");

  const [isDistributeOpen, setIsDistributeOpen] = useState(false);
  const [distributeAmount, setDistributeAmount] = useState("0");
  const [distributionStrategy, setDistributionStrategy] = useState<
    "equal" | "historical"
  >("equal");

  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateUseSelectionOnly, setTemplateUseSelectionOnly] =
    useState(true);

  const [templateToApply, setTemplateToApply] = useState<string | null>(null);
  const [isApplyTemplateOpen, setIsApplyTemplateOpen] = useState(false);
  const [applyTemplateOverwrite, setApplyTemplateOverwrite] = useState(false);
  const [applyTemplateOnlySelection, setApplyTemplateOnlySelection] =
    useState(false);

  const [importOverwrite, setImportOverwrite] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const templatesQuery = trpc.provisions.listTemplates.useQuery();
  const historyQuery = trpc.provisions.history.useQuery({
    period,
    limit: 20,
  });
  const recurringRulesQuery = trpc.provisions.recurringRules.useQuery();

  const bulkSetValueMutation = trpc.provisions.bulkSetValue.useMutation({
    onSuccess: async (data) => {
      toast.success(`Atualizamos ${data.count} categorias.`);
      setIsSetValueOpen(false);
      setSetValueAmount("0");
      await Promise.resolve(onRefetch());
      void historyQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Não foi possível aplicar o valor em lote.");
    },
  });

  const bulkDistributeMutation = trpc.provisions.bulkDistribute.useMutation({
    onSuccess: async (data) => {
      toast.success(`Distribuímos valores em ${data.count} categorias.`);
      setIsDistributeOpen(false);
      setDistributeAmount("0");
      await Promise.resolve(onRefetch());
      void historyQuery.refetch();
    },
    onError: (error) => {
      toast.error(
        error.message ||
          "Não foi possível distribuir o valor entre as categorias.",
      );
    },
  });

  const copySelectionMutation = trpc.provisions.copyFromPrevious.useMutation({
    onSuccess: async (data) => {
      toast.success(
        `Importamos ${data.inserted} categorias e atualizamos ${data.updated}.`,
      );
      await Promise.resolve(onRefetch());
      void historyQuery.refetch();
    },
    onError: (error) => {
      toast.error(
        error.message || "Não foi possível copiar os valores do mês anterior.",
      );
    },
  });

  const saveTemplateMutation = trpc.provisions.upsertTemplate.useMutation({
    onSuccess: async () => {
      toast.success("Template salvo com sucesso.");
      setIsSaveTemplateOpen(false);
      setTemplateName("");
      setTemplateDescription("");
      await Promise.resolve(onRefetch());
      void templatesQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Não foi possível salvar o template.");
    },
  });

  const applyTemplateMutation = trpc.provisions.applyTemplate.useMutation({
    onSuccess: async (result) => {
      toast.success(
        `Template aplicado (${result.inserted} novos, ${result.updated} atualizados).`,
      );
      setIsApplyTemplateOpen(false);
      await Promise.resolve(onRefetch());
      void historyQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Não foi possível aplicar o template.");
    },
  });

  const importCsvMutation = trpc.provisions.importCsv.useMutation({
    onSuccess: async (result) => {
      toast.success(
        `Importação concluída: ${result.inserted} criados, ${result.updated} atualizados.`,
      );
      await Promise.resolve(onRefetch());
      void historyQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Falha ao importar o arquivo CSV.");
    },
  });

  const exportCsvMutation = trpc.provisions.exportCsv.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `provisionamento-${period.year}-${String(
        period.month + 1,
      ).padStart(2, "0")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Exportação concluída.");
    },
    onError: (error) => {
      toast.error(error.message || "Não foi possível exportar o CSV.");
    },
  });

  const handleSetValueSubmit = () => {
    if (selectionCount === 0) {
      toast.error("Selecione pelo menos uma categoria.");
      return;
    }
    const parsed = Number.parseFloat(setValueAmount.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    bulkSetValueMutation.mutate({
      period,
      categoryIds: selectedCategoryIds,
      mode: setValueMode,
      value: parsed,
      noteStrategy: setValueNote.trim().length ? "replace" : "keep",
      note: setValueNote.trim().length ? setValueNote.trim() : undefined,
    });
  };

  const handleDistributeSubmit = () => {
    if (selectionCount === 0) {
      toast.error("Selecione pelo menos uma categoria.");
      return;
    }
    const parsed = Number.parseFloat(distributeAmount.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Informe um valor maior que zero para distribuir.");
      return;
    }
    bulkDistributeMutation.mutate({
      period,
      categoryIds: selectedCategoryIds,
      amount: parsed,
      strategy: distributionStrategy,
    });
  };

  const handleZeroSelection = () => {
    if (selectionCount === 0) {
      toast.error("Selecione pelo menos uma categoria.");
      return;
    }
    bulkSetValueMutation.mutate({
      period,
      categoryIds: selectedCategoryIds,
      mode: "absolute",
      value: 0,
      noteStrategy: "keep",
    });
  };

  const handleCopySelection = () => {
    if (selectionCount === 0) {
      toast.error("Selecione pelo menos uma categoria.");
      return;
    }
    if (!previousPeriod) {
      toast.error("Não foi possível identificar o mês anterior.");
      return;
    }
    copySelectionMutation.mutate({
      from: previousPeriod,
      to: period,
      categoryIds: selectedCategoryIds,
      overwrite: true,
    });
  };

  const handleTemplateSave = () => {
    const trimmedName = templateName.trim();
    if (!trimmedName) {
      toast.error("Informe um nome para o template.");
      return;
    }
    const categoryIds =
      templateUseSelectionOnly && selectionCount > 0
        ? selectedCategoryIds
        : rows.map((row) => row.categoryId);
    saveTemplateMutation.mutate({
      name: trimmedName,
      description: templateDescription.trim() || undefined,
      period,
      categoryIds,
    });
  };

  const handleApplyTemplate = () => {
    if (!templateToApply) {
      toast.error("Selecione um template.");
      return;
    }
    const categoryIds =
      applyTemplateOnlySelection && selectionCount > 0
        ? selectedCategoryIds
        : undefined;
    applyTemplateMutation.mutate({
      templateId: templateToApply,
      target: period,
      overwrite: applyTemplateOverwrite,
      categoryIds,
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    file
      .text()
      .then((content) => {
        const lines = content
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);
        if (lines.length <= 1) {
          toast.error("Arquivo vazio ou sem dados válidos.");
          return;
        }
        const [headerLine, ...rowsLines] = lines;
        const headers = headerLine
          .split(";")
          .map((column) => column.trim().toLowerCase());
        const categoryIdIndex = headers.indexOf("category_id");
        const categoryNameIndex = headers.indexOf("category_name");
        const monthIndex = headers.indexOf("month");
        const yearIndex = headers.indexOf("year");
        const amountIndex = headers.indexOf("planned_amount");
        const noteIndex = headers.indexOf("note");

        if (
          monthIndex === -1 ||
          yearIndex === -1 ||
          amountIndex === -1 ||
          (categoryIdIndex === -1 && categoryNameIndex === -1)
        ) {
          toast.error("Cabeçalho inválido no arquivo CSV.");
          return;
        }

        const parsedRows = rowsLines
          .map((line) => line.split(";"))
          .filter((columns) => columns.length >= headers.length)
          .map((columns) => {
            const categoryId =
              categoryIdIndex >= 0
                ? normalizeCsvString(columns[categoryIdIndex])
                : undefined;
            const categoryName =
              categoryNameIndex >= 0
                ? normalizeCsvString(columns[categoryNameIndex])
                : undefined;
            const monthValue = Number.parseInt(columns[monthIndex] ?? "", 10);
            const yearValue = Number.parseInt(columns[yearIndex] ?? "", 10);
            const plannedAmount = parseCsvAmount(columns[amountIndex] ?? "0");
            const note =
              noteIndex >= 0
                ? normalizeCsvString(columns[noteIndex])
                : undefined;

            return {
              categoryId: categoryId ?? undefined,
              categoryName,
              month: Number.isFinite(monthValue) ? monthValue : period.month,
              year: Number.isFinite(yearValue) ? yearValue : period.year,
              plannedAmount,
              note,
            };
          })
          .filter((row) => row.categoryId || row.categoryName);

        if (!parsedRows.length) {
          toast.error("Nenhuma linha válida encontrada para importação.");
          return;
        }

        importCsvMutation.mutate({
          rows: parsedRows,
          overwrite: importOverwrite,
        });
      })
      .catch(() => {
        toast.error("Não foi possível ler o arquivo.");
      })
      .finally(() => {
        if (event.target) {
          event.target.value = "";
        }
      });
  };

  const disabledBulk = selectionCount === 0;
  const selectionLabel =
    selectionCount === 0
      ? "Nenhuma categoria selecionada"
      : `${selectionCount} categoria${selectionCount > 1 ? "s" : ""} selecionada${
          selectionCount > 1 ? "s" : ""
        }`;

  return (
    <section className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconAdjustmentsAlt className="size-4 text-muted-foreground" />
              Ações em massa
            </CardTitle>
            <CardDescription>
              Atualize rapidamente valores planejados para várias categorias ao
              mesmo tempo.
            </CardDescription>
            <div className="text-xs text-muted-foreground">
              {selectionLabel}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => setIsSetValueOpen(true)}
                disabled={disabledBulk}
              >
                Definir valor
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopySelection}
                disabled={disabledBulk || copySelectionMutation.isPending}
                isLoading={copySelectionMutation.isPending}
                icon={<IconClipboardCopy className="size-4" />}
              >
                Copiar mês anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsDistributeOpen(true)}
                disabled={disabledBulk}
              >
                Distribuir valor
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleZeroSelection}
                disabled={disabledBulk}
                icon={<IconArchiveOff className="size-4" />}
              >
                Zerar seleção
              </Button>
            </div>
            {selectionCount > 0 ? (
              <div className="space-y-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  Categorias selecionadas:
                </span>
                <div className="flex flex-wrap gap-1">
                  {selectedRows.slice(0, 6).map((row) => (
                    <Badge key={row.categoryId} variant="muted">
                      {row.name}
                    </Badge>
                  ))}
                  {selectionCount > 6 ? (
                    <Badge variant="outline">
                      +{selectionCount - 6} categoria
                      {selectionCount - 6 > 1 ? "s" : ""}
                    </Badge>
                  ) : null}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconLayoutGridAdd className="size-4 text-muted-foreground" />
              Modelos e templates
            </CardTitle>
            <CardDescription>
              Salve configurações recorrentes e aplique rapidamente em próximos
              meses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setIsSaveTemplateOpen(true)}>
                Salvar como template
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsApplyTemplateOpen(true)}
                disabled={!templatesQuery.data?.length}
              >
                Aplicar template
              </Button>
            </div>
            <Separator />
            <div className="space-y-3">
              <p className="text-xs uppercase text-muted-foreground">
                Templates salvos
              </p>
              {templatesQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : templatesQuery.data && templatesQuery.data.length > 0 ? (
                <div className="space-y-2">
                  {templatesQuery.data.slice(0, 3).map((template) => (
                    <div
                      key={template.id}
                      className="flex flex-col rounded-md border border-border/80 bg-muted/30 px-3 py-2"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {template.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {template.items.length} categoria
                        {template.items.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
                  {templatesQuery.data.length > 3 ? (
                    <p className="text-xs text-muted-foreground">
                      +{templatesQuery.data.length - 3} outros templates
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum template salvo até o momento.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconArchive className="size-4 text-muted-foreground" />
              Importar / Exportar
            </CardTitle>
            <CardDescription>
              Use planilhas para acelerar o planejamento de múltiplos períodos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleImportFileChange}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleImportClick}
                isLoading={importCsvMutation.isPending}
                disabled={importCsvMutation.isPending}
                icon={<IconArchive className="size-4" />}
              >
                Importar CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportCsvMutation.mutate(period)}
                isLoading={exportCsvMutation.isPending}
                disabled={exportCsvMutation.isPending}
                icon={<IconDatabaseExport className="size-4" />}
              >
                Exportar mês atual
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="import-overwrite"
                checked={importOverwrite}
                onCheckedChange={(value) => setImportOverwrite(Boolean(value))}
                disabled={importCsvMutation.isPending}
              />
              <Label htmlFor="import-overwrite" className="text-sm">
                Sobrescrever valores existentes
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Estrutura esperada:{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                category_id;category_name;month;year;planned_amount;note
              </code>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconRobot className="size-4 text-muted-foreground" />
              Regras recorrentes
            </CardTitle>
            <CardDescription>
              Visualize provisões automatizadas que serão aplicadas nos próximos
              meses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recurringRulesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">
                Carregando regras...
              </p>
            ) : recurringRulesQuery.data &&
              recurringRulesQuery.data.length > 0 ? (
              <ScrollArea className="max-h-48 rounded-md border border-border/60">
                <div className="divide-y divide-border/60">
                  {recurringRulesQuery.data.map((rule) => {
                    const category = rowMap.get(rule.categoryId);
                    const startLabel = formatPeriodLabel(
                      rule.startMonth,
                      rule.startYear,
                    );
                    const endLabel =
                      rule.endMonth !== null && rule.endYear !== null
                        ? formatPeriodLabel(rule.endMonth, rule.endYear)
                        : "Sem término";
                    return (
                      <div key={rule.id} className="p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground">
                            {category?.name ?? "Categoria"}
                          </span>
                          <Badge variant="muted">
                            {formatCurrency(rule.plannedAmount)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Vigência: {startLabel} • {endLabel}
                        </p>
                        {rule.notes ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {rule.notes}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma regra recorrente cadastrada ainda.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <IconHistory className="size-4 text-muted-foreground" />
            Histórico recente
          </CardTitle>
          <CardDescription>
            Últimas alterações registradas para manter a rastreabilidade do
            time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">
              Carregando histórico...
            </p>
          ) : historyQuery.data && historyQuery.data.length > 0 ? (
            <ScrollArea className="max-h-72 rounded-md border border-border/60">
              <div className="divide-y divide-border/60">
                {historyQuery.data.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-1 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">
                        {item.categoryName}
                      </span>
                      <Badge variant="outline">{item.action}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.userName} • {item.periodLabel} •{" "}
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString("pt-BR")
                        : ""}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      {item.previousAmount !== null ? (
                        <span>
                          De {formatCurrency(item.previousAmount)} para{" "}
                          {formatCurrency(item.newAmount ?? 0)}
                        </span>
                      ) : (
                        <span>
                          Novo valor: {formatCurrency(item.newAmount ?? 0)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma alteração registrada para o período selecionado.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Dialog open={isSetValueOpen} onOpenChange={setIsSetValueOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir valor para seleção</DialogTitle>
            <DialogDescription>
              Aplique um valor único (ou percentual) para as categorias
              selecionadas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <RadioGroup
              value={setValueMode}
              onValueChange={(value) =>
                setSetValueMode(value as "absolute" | "relative")
              }
              className="grid gap-2 sm:grid-cols-2"
            >
              <Label
                htmlFor="set-mode-absolute"
                className={cn(
                  "rounded-md border border-input p-3 text-sm",
                  setValueMode === "absolute" && "border-primary",
                )}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    id="set-mode-absolute"
                    value="absolute"
                    className="translate-y-[1px]"
                  />
                  Valor absoluto
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Define o valor exato em moeda.
                </p>
              </Label>
              <Label
                htmlFor="set-mode-relative"
                className={cn(
                  "rounded-md border border-input p-3 text-sm",
                  setValueMode === "relative" && "border-primary",
                )}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    id="set-mode-relative"
                    value="relative"
                    className="translate-y-[1px]"
                  />
                  Percentual
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Aplica uma porcentagem do valor atual.
                </p>
              </Label>
            </RadioGroup>

            <div className="space-y-2">
              <Label htmlFor="set-value-amount">
                {setValueMode === "absolute" ? "Valor (R$)" : "Percentual (%)"}
              </Label>
              <Input
                id="set-value-amount"
                type="number"
                min="0"
                step="0.01"
                value={setValueAmount}
                onChange={(event) => setSetValueAmount(event.target.value)}
                placeholder={
                  setValueMode === "absolute" ? "Ex.: 2500" : "Ex.: 10"
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="set-value-note">Observação (opcional)</Label>
              <Textarea
                id="set-value-note"
                value={setValueNote}
                onChange={(event) => setSetValueNote(event.target.value)}
                placeholder="Registrar contexto para o time..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSetValueOpen(false)}
              disabled={bulkSetValueMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSetValueSubmit}
              isLoading={bulkSetValueMutation.isPending}
              disabled={bulkSetValueMutation.isPending}
            >
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDistributeOpen} onOpenChange={setIsDistributeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Distribuir valor entre seleção</DialogTitle>
            <DialogDescription>
              Reparte automaticamente o valor informado entre as categorias
              selecionadas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="distribute-amount">
                Valor total a distribuir
              </Label>
              <Input
                id="distribute-amount"
                type="number"
                min="0"
                step="0.01"
                value={distributeAmount}
                onChange={(event) => setDistributeAmount(event.target.value)}
                placeholder="Ex.: 5000"
              />
            </div>
            <div className="space-y-2">
              <Label>Estratégia de distribuição</Label>
              <RadioGroup
                value={distributionStrategy}
                onValueChange={(value) =>
                  setDistributionStrategy(value as "equal" | "historical")
                }
                className="space-y-2"
              >
                <div className="flex items-center gap-2 rounded-md border border-input p-3 text-sm">
                  <RadioGroupItem value="equal" id="strategy-equal" />
                  <Label
                    htmlFor="strategy-equal"
                    className="flex flex-col gap-1"
                  >
                    Divisão igualitária
                    <span className="text-xs text-muted-foreground">
                      Todas as categorias recebem o mesmo valor.
                    </span>
                  </Label>
                </div>
                <div className="flex items-center gap-2 rounded-md border border-input p-3 text-sm">
                  <RadioGroupItem value="historical" id="strategy-historical" />
                  <Label
                    htmlFor="strategy-historical"
                    className="flex flex-col gap-1"
                  >
                    Proporcional ao histórico
                    <span className="text-xs text-muted-foreground">
                      Considera gastos dos últimos meses para distribuir.
                    </span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDistributeOpen(false)}
              disabled={bulkDistributeMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDistributeSubmit}
              isLoading={bulkDistributeMutation.isPending}
              disabled={bulkDistributeMutation.isPending}
            >
              Distribuir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSaveTemplateOpen} onOpenChange={setIsSaveTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar como template</DialogTitle>
            <DialogDescription>
              Crie um modelo para reaproveitar essa configuração em outros
              meses.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Nome do template</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder="Ex.: Orçamento Essenciais"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Descrição (opcional)</Label>
              <Textarea
                id="template-description"
                value={templateDescription}
                onChange={(event) =>
                  setTemplateDescription(event.target.value.slice(0, 200))
                }
                placeholder="Notas rápidas para orientar a aplicação do modelo."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Será salvo com as categorias e valores do mês{" "}
                {formatPeriodLabel(period.month, period.year)}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="template-use-selection"
                checked={templateUseSelectionOnly && selectionCount > 0}
                disabled={selectionCount === 0}
                onCheckedChange={(value) =>
                  setTemplateUseSelectionOnly(
                    selectionCount === 0 ? false : Boolean(value),
                  )
                }
              />
              <Label htmlFor="template-use-selection" className="text-sm">
                Salvar apenas categorias selecionadas
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSaveTemplateOpen(false)}
              disabled={saveTemplateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleTemplateSave}
              isLoading={saveTemplateMutation.isPending}
              disabled={saveTemplateMutation.isPending}
            >
              Salvar template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isApplyTemplateOpen} onOpenChange={setIsApplyTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aplicar template</DialogTitle>
            <DialogDescription>
              Selecione um template salvo para preencher o planejamento do mês
              atual.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template disponível</Label>
              <div className="space-y-2">
                {templatesQuery.data && templatesQuery.data.length > 0 ? (
                  templatesQuery.data.map((template) => (
                    <label
                      key={template.id}
                      className={cn(
                        "flex cursor-pointer flex-col gap-1 rounded-md border border-input p-3 text-sm",
                        templateToApply === template.id && "border-primary",
                      )}
                    >
                      <input
                        type="radio"
                        name="template"
                        value={template.id}
                        className="sr-only"
                        checked={templateToApply === template.id}
                        onChange={() => setTemplateToApply(template.id)}
                      />
                      <span className="font-medium text-foreground">
                        {template.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {template.description ?? "Sem descrição"} •{" "}
                        {template.items.length} categoria
                        {template.items.length > 1 ? "s" : ""}
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum template cadastrado.
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="apply-template-overwrite"
                  checked={applyTemplateOverwrite}
                  onCheckedChange={(value) =>
                    setApplyTemplateOverwrite(Boolean(value))
                  }
                />
                <Label htmlFor="apply-template-overwrite" className="text-sm">
                  Sobrescrever valores existentes
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="apply-template-selection"
                  checked={applyTemplateOnlySelection && selectionCount > 0}
                  disabled={selectionCount === 0}
                  onCheckedChange={(value) =>
                    setApplyTemplateOnlySelection(
                      selectionCount === 0 ? false : Boolean(value),
                    )
                  }
                />
                <Label htmlFor="apply-template-selection" className="text-sm">
                  Aplicar apenas às categorias selecionadas
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsApplyTemplateOpen(false)}
              disabled={applyTemplateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApplyTemplate}
              isLoading={applyTemplateMutation.isPending}
              disabled={applyTemplateMutation.isPending}
            >
              Aplicar template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
