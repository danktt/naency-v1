"use client";

import { Tab, Tabs } from "@heroui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconCalendar, IconChevronDown, IconPlus } from "@tabler/icons-react";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FieldCurrencyAmount } from "@/components/FieldCurrencyAmount";
import { CategoriesSelect } from "@/components/Selects/CategoriesSelect";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogClose,
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
import { Input, NumberInputCounter } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import type { AppRouter } from "@/server/api/root";
import { useDateStore } from "@/stores/useDateStore";
import { Checkbox } from "../ui/checkbox";
import { ScrollArea } from "../ui/scroll-area";

const paymentMethodValues = [
  "pix",
  "transfer",
  "debit",
  "credit",
  "cash",
  "boleto",
  "investment",
] as const;

type PaymentMethodValue = (typeof paymentMethodValues)[number];

const paymentMethodOptions: Array<{
  value: PaymentMethodValue;
  label: string;
}> = [
  { value: "pix", label: "Pix" },
  { value: "transfer", label: "Transferência" },
  { value: "debit", label: "Débito" },
  { value: "credit", label: "Crédito" },
  { value: "cash", label: "Dinheiro" },
  { value: "boleto", label: "Boleto" },
  { value: "investment", label: "Investimento" },
];

type RouterOutput = inferRouterOutputs<AppRouter>;
type IncomeTransaction = RouterOutput["transactions"]["list"][number];
type IncomeFormMode = "create" | "edit";

type IncomesFormProps = {
  mode?: IncomeFormMode;
  income?: IncomeTransaction | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
};

const createIncomeFormSchema = () =>
  z
    .object({
      description: z.string().min(1, "Informe uma descrição."),
      amount: z.number().int().min(1, "Informe um valor maior que zero."),
      currency: z.enum(["BRL", "USD", "EUR"]),
      date: z.date(),
      accountId: z.string().uuid("Selecione uma conta."),
      categoryId: z.string().uuid("Selecione uma categoria."),
      method: z.enum(paymentMethodValues),
      attachmentUrl: z
        .string()
        .trim()
        .refine(
          (value) => value.length === 0 || isValidUrl(value),
          "Informe uma URL válida.",
        ),
      mode: z.enum(["unique", "installment", "recurring"]),
      totalInstallments: z
        .number()
        .int()
        .min(2, "Informe pelo menos duas parcelas.")
        .optional(),
      recurrenceType: z
        .enum(["daily", "weekly", "monthly", "yearly"])
        .optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      isPaid: z.boolean(),
      paidAt: z.date().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.isPaid && !data.paidAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paidAt"],
          message: "Informe a data de pagamento.",
        });
      }
    });

type CreateIncomeFormValues = z.infer<
  ReturnType<typeof createIncomeFormSchema>
>;

const getDefaultValues = (
  overrides?: Partial<CreateIncomeFormValues>,
): CreateIncomeFormValues => {
  const now = new Date();
  const mode = overrides?.mode ?? "unique";
  const date = overrides?.date ?? now;
  const isPaid = overrides?.isPaid ?? mode === "unique";

  const values: CreateIncomeFormValues = {
    description: "",
    amount: 0,
    currency: "BRL",
    date,
    accountId: "",
    categoryId: "",
    method: "pix",
    attachmentUrl: "",
    mode,
    totalInstallments: 2,
    recurrenceType: "monthly",
    isPaid,
    paidAt: overrides?.paidAt ?? (isPaid ? date : undefined),
  };

  const merged = {
    ...values,
    ...overrides,
  };

  if (merged.isPaid && !merged.paidAt) {
    merged.paidAt = merged.date;
  }

  if (!merged.isPaid) {
    merged.paidAt = undefined;
  }

  return merged;
};

function isValidUrl(value: string) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function mapIncomeToDefaultValues(
  income: IncomeTransaction,
): CreateIncomeFormValues {
  const mode = income.installmentGroupId
    ? "installment"
    : income.recurringId
      ? "recurring"
      : "unique";

  const amountInCents = Math.round(Number(income.amount) * 100);

  return getDefaultValues({
    description: income.description,
    amount: Number.isNaN(amountInCents) ? 0 : amountInCents,
    date: income.date ? new Date(income.date) : new Date(),
    accountId: income.accountId ?? "",
    categoryId: income.categoryId ?? "",
    method: income.method,
    attachmentUrl: income.attachmentUrl ?? "",
    mode,
    totalInstallments: income.totalInstallments ?? 2,
    isPaid: income.isPaid ?? false,
    paidAt: income.paidAt ? new Date(income.paidAt) : undefined,
  });
}

export function IncomesForm(props: IncomesFormProps = {}) {
  const {
    mode: forcedMode,
    income = null,
    open,
    onOpenChange,
    trigger,
    onSuccess,
  } = props;

  const hasIncome = Boolean(income);
  const derivedMode: IncomeFormMode =
    forcedMode ?? (hasIncome ? "edit" : "create");
  const isEditing = derivedMode === "edit" && hasIncome;
  const effectiveIncome = isEditing ? income : null;

  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = React.useState(false);
  const [isStartDatePopoverOpen, setIsStartDatePopoverOpen] =
    React.useState(false);
  const [isEndDatePopoverOpen, setIsEndDatePopoverOpen] = React.useState(false);
  const [isPaidAtPopoverOpen, setIsPaidAtPopoverOpen] = React.useState(false);
  const [keepOpen, setKeepOpen] = React.useState(false);
  const keepOpenId = React.useId();
  const keepOpenRef = React.useRef(keepOpen);

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? Boolean(open) : internalOpen;

  const locale = ptBR;

  const schema = React.useMemo(() => createIncomeFormSchema(), []);

  const dateRange = useDateStore((state) => state.dateRange);
  const utils = trpc.useUtils();

  const defaultValues = React.useMemo(() => {
    if (isEditing && effectiveIncome) {
      return mapIncomeToDefaultValues(effectiveIncome);
    }
    return getDefaultValues();
  }, [effectiveIncome, isEditing]);

  const form = useForm<CreateIncomeFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onSubmit",
  });

  React.useEffect(() => {
    keepOpenRef.current = keepOpen;
  }, [keepOpen]);

  React.useEffect(() => {
    if (dialogOpen && isEditing && effectiveIncome) {
      form.reset(mapIncomeToDefaultValues(effectiveIncome));
    }
  }, [dialogOpen, effectiveIncome, isEditing, form]);

  const closeDialog = React.useCallback(() => {
    if (!isControlled) {
      setInternalOpen(false);
    }
    onOpenChange?.(false);
    setIsDatePopoverOpen(false);
    setIsStartDatePopoverOpen(false);
    setIsEndDatePopoverOpen(false);
    setIsPaidAtPopoverOpen(false);

    if (isEditing && effectiveIncome) {
      form.reset(mapIncomeToDefaultValues(effectiveIncome));
    } else {
      form.reset(getDefaultValues());
      setKeepOpen(false);
    }
  }, [effectiveIncome, form, isControlled, isEditing, onOpenChange]);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        if (!isControlled) {
          setInternalOpen(true);
        }
        onOpenChange?.(true);
        return;
      }

      closeDialog();
    },
    [closeDialog, isControlled, onOpenChange],
  );

  const accountsQuery = trpc.accounts.list.useQuery(undefined, {
    enabled: dialogOpen,
  });

  const invalidateTransactionsData = React.useCallback(async () => {
    await Promise.all([
      utils.transactions.list.invalidate({ type: "income" }),
      utils.transactions.metrics.invalidate(),
    ]);
  }, [utils]);

  const createIncomeMutation = trpc.transactions.create.useMutation({
    onSuccess: async () => {
      await invalidateTransactionsData();
      toast.success("Receita registrada com sucesso.");
      if (keepOpenRef.current) {
        form.reset(getDefaultValues());
        form.setFocus("description");
      } else {
        closeDialog();
      }
      onSuccess?.();
    },
    onError: (error) =>
      toast.error(error.message ?? "Não foi possível registrar a receita."),
  });

  const updateIncomeMutation = trpc.transactions.update.useMutation({
    onSuccess: async () => {
      await invalidateTransactionsData();
      toast.success("Receita atualizada com sucesso.");
      closeDialog();
      onSuccess?.();
    },
    onError: (error) =>
      toast.error(error.message ?? "Não foi possível atualizar a receita."),
  });

  const isSubmitting = isEditing
    ? updateIncomeMutation.isPending
    : createIncomeMutation.isPending;
  const hasAccounts = (accountsQuery.data?.length ?? 0) > 0;
  const isFormDisabled = !hasAccounts;

  const modeValue = form.watch("mode");
  const isUnique = modeValue === "unique";
  const isInstallment = modeValue === "installment";
  const isRecurring = modeValue === "recurring";
  const isPaidValue = form.watch("isPaid");
  const dateValue = form.watch("date");

  React.useEffect(() => {
    if (!dialogOpen) {
      return;
    }

    if (!isPaidValue) {
      form.setValue("paidAt", undefined, { shouldDirty: false });
      return;
    }

    const currentMode = form.getValues("mode");
    if (!isEditing && currentMode === "unique") {
      form.setValue("paidAt", form.getValues("date"), {
        shouldDirty: false,
      });
      return;
    }

    const paidAt = form.getValues("paidAt");
    if (!paidAt) {
      form.setValue("paidAt", form.getValues("date"), {
        shouldDirty: false,
      });
    }
  }, [dialogOpen, dateValue, form, isEditing, isPaidValue]);

  React.useEffect(() => {
    if (!dialogOpen || isEditing) {
      return;
    }

    if (modeValue !== "unique" && form.getValues("isPaid")) {
      form.setValue("isPaid", false, { shouldDirty: true });
    }
  }, [dialogOpen, form, isEditing, modeValue]);

  const onSubmit = React.useCallback(
    (values: CreateIncomeFormValues) => {
      const amountInCents = values.amount;
      const attachmentUrl = values.attachmentUrl?.trim().length
        ? values.attachmentUrl.trim()
        : undefined;
      const paidAt = values.isPaid ? (values.paidAt ?? values.date) : undefined;

      const payload = {
        type: "income" as const,
        accountId: values.accountId,
        categoryId: values.categoryId,
        amount: amountInCents / 100,
        description: values.description,
        date: values.date,
        method: values.method,
        attachmentUrl,
        mode: values.mode,
        totalInstallments: values.totalInstallments,
        recurrenceType: values.recurrenceType,
        startDate: values.startDate,
        endDate: values.endDate,
        isPaid: values.isPaid,
        paidAt,
      };

      if (isEditing && effectiveIncome) {
        updateIncomeMutation.mutate({
          ...payload,
          id: effectiveIncome.id,
        });
      } else {
        createIncomeMutation.mutate(payload);
      }
    },
    [createIncomeMutation, effectiveIncome, isEditing, updateIncomeMutation],
  );

  const motionProps = {
    initial: { opacity: 0, y: -10, height: 0 },
    animate: { opacity: 1, y: 0, height: "auto" },
    exit: { opacity: 0, y: -10, height: 0 },
    transition: { duration: 0.25, ease: "easeInOut" },
  } as const;

  const triggerNode =
    trigger !== undefined ? (
      trigger
    ) : isEditing ? null : (
      <Button icon={<IconPlus className="size-4" />}>Criar receita</Button>
    );

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {triggerNode ? (
        <DialogTrigger asChild>{triggerNode}</DialogTrigger>
      ) : null}

      <DialogContent
        className={cn(
          "flex w-full flex-col p-0 sm:max-w-3xl",
          "max-h-[90vh] sm:max-h-[calc(100vh-4rem)]",
        )}
      >
        <motion.div layout className="flex flex-1 flex-col overflow-hidden">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-1 flex-col min-h-0"
            >
              {/* Header */}
              <div className="sm:px-4 px-4 pt-6 pb-4 space-y-4 shrink-0">
                <DialogHeader className="px-0 text-left">
                  <DialogTitle>
                    {isEditing ? "Editar receita" : "Criar receita"}
                  </DialogTitle>
                  <DialogDescription>
                    {isEditing
                      ? "Atualize as informações abaixo para editar esta receita."
                      : "Preencha as informações abaixo para registrar uma receita."}
                  </DialogDescription>
                </DialogHeader>

                {/* Mode Tabs */}
                <FormField
                  control={form.control}
                  name="mode"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">
                        Tipo de transação
                      </FormLabel>
                      <FormControl>
                        <Tabs
                          fullWidth
                          selectedKey={field.value}
                          onSelectionChange={(value) => {
                            if (isEditing) return;
                            field.onChange(
                              value as CreateIncomeFormValues["mode"],
                            );
                          }}
                        >
                          <Tab
                            key="unique"
                            disabled={isEditing}
                            title="Única"
                          />
                          <Tab
                            key="installment"
                            disabled={isEditing}
                            title="Parcelada"
                          />
                          <Tab
                            key="recurring"
                            disabled={isEditing}
                            title="Recorrente"
                          />
                        </Tabs>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Scrollable Content */}
              <ScrollArea className="flex-1 sm:px-4 px-4 overflow-y-auto">
                <div className="space-y-6 px-1 pb-1">
                  {/* === Dates Section === */}
                  <section className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Defina quando esta receita deve ser recebida ou iniciar a
                      recorrência.
                    </p>
                    <AnimatePresence initial={false} mode="wait">
                      {isUnique && (
                        <motion.div key="unique" {...motionProps}>
                          <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => {
                              const selectedDate = field.value;
                              return (
                                <FormItem>
                                  <FormLabel>Data de recebimento</FormLabel>
                                  <FormControl>
                                    <Popover
                                      open={isDatePopoverOpen}
                                      onOpenChange={setIsDatePopoverOpen}
                                    >
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !selectedDate &&
                                              "text-muted-foreground",
                                          )}
                                          disabled={isSubmitting}
                                        >
                                          <IconCalendar className="mr-2 h-4 w-4" />
                                          {selectedDate
                                            ? format(selectedDate, "PPP", {
                                                locale,
                                              })
                                            : "Selecione uma data"}
                                          <IconChevronDown className="ml-auto h-4 w-4" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent
                                        className="w-auto p-0"
                                        align="start"
                                      >
                                        <Calendar
                                          mode="single"
                                          selected={selectedDate}
                                          onSelect={(next) => {
                                            if (next) {
                                              field.onChange(next);
                                              setIsDatePopoverOpen(false);
                                            }
                                          }}
                                          defaultMonth={
                                            selectedDate ?? dateRange.to
                                          }
                                          locale={locale}
                                        />
                                      </PopoverContent>
                                    </Popover>
                                  </FormControl>
                                </FormItem>
                              );
                            }}
                          />
                        </motion.div>
                      )}

                      {isInstallment && (
                        <motion.div
                          key="installment"
                          {...motionProps}
                          className="grid gap-4 sm:grid-cols-2"
                        >
                          <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => {
                              const selectedDate = field.value;
                              return (
                                <FormItem>
                                  <FormLabel>
                                    Data da primeira parcela
                                  </FormLabel>
                                  <FormControl>
                                    <Popover
                                      open={isDatePopoverOpen}
                                      onOpenChange={setIsDatePopoverOpen}
                                    >
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !selectedDate &&
                                              "text-muted-foreground",
                                          )}
                                          disabled={isSubmitting}
                                        >
                                          <IconCalendar className="mr-2 h-4 w-4" />
                                          {selectedDate
                                            ? format(selectedDate, "PPP", {
                                                locale,
                                              })
                                            : "Selecione uma data"}
                                          <IconChevronDown className="ml-auto h-4 w-4" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent
                                        className="w-auto p-0"
                                        align="start"
                                      >
                                        <Calendar
                                          mode="single"
                                          selected={selectedDate}
                                          onSelect={(next) => {
                                            if (next) {
                                              field.onChange(next);
                                              setIsDatePopoverOpen(false);
                                            }
                                          }}
                                          defaultMonth={
                                            selectedDate ?? dateRange.to
                                          }
                                          locale={locale}
                                        />
                                      </PopoverContent>
                                    </Popover>
                                  </FormControl>
                                </FormItem>
                              );
                            }}
                          />
                          <FormField
                            control={form.control}
                            name="totalInstallments"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Total de parcelas</FormLabel>
                                <FormControl>
                                  <NumberInputCounter
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    ref={field.ref}
                                    minValue={2}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      )}

                      {isRecurring && (
                        <motion.div
                          key="recurring"
                          {...motionProps}
                          className="grid gap-4 sm:grid-cols-2 md:grid-cols-3"
                        >
                          <FormField
                            control={form.control}
                            name="recurrenceType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Frequência da recorrência</FormLabel>
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Selecione a frequência" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="daily">
                                      Diária
                                    </SelectItem>
                                    <SelectItem value="weekly">
                                      Semanal
                                    </SelectItem>
                                    <SelectItem value="monthly">
                                      Mensal
                                    </SelectItem>
                                    <SelectItem value="yearly">
                                      Anual
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="startDate"
                            render={({ field }) => {
                              const selected = field.value;
                              return (
                                <FormItem>
                                  <FormLabel>Data de início</FormLabel>
                                  <FormControl>
                                    <Popover
                                      open={isStartDatePopoverOpen}
                                      onOpenChange={setIsStartDatePopoverOpen}
                                    >
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !selected &&
                                              "text-muted-foreground",
                                          )}
                                          disabled={isSubmitting}
                                        >
                                          <IconCalendar className="mr-2 h-4 w-4" />
                                          {selected
                                            ? format(selected, "PPP", {
                                                locale,
                                              })
                                            : "Selecione uma data"}
                                          <IconChevronDown className="ml-auto h-4 w-4" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent
                                        className="w-auto p-0"
                                        align="start"
                                      >
                                        <Calendar
                                          mode="single"
                                          selected={selected}
                                          onSelect={(next) => {
                                            if (next) {
                                              field.onChange(next);
                                              setIsStartDatePopoverOpen(false);
                                            }
                                          }}
                                          defaultMonth={
                                            selected ?? dateRange.to
                                          }
                                          locale={locale}
                                        />
                                      </PopoverContent>
                                    </Popover>
                                  </FormControl>
                                </FormItem>
                              );
                            }}
                          />
                          <FormField
                            control={form.control}
                            name="endDate"
                            render={({ field }) => {
                              const selected = field.value;
                              return (
                                <FormItem>
                                  <FormLabel>
                                    Data de término (opcional)
                                  </FormLabel>
                                  <FormControl>
                                    <Popover
                                      open={isEndDatePopoverOpen}
                                      onOpenChange={setIsEndDatePopoverOpen}
                                    >
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !selected &&
                                              "text-muted-foreground",
                                          )}
                                          disabled={isSubmitting}
                                        >
                                          <IconCalendar className="mr-2 h-4 w-4" />
                                          {selected
                                            ? format(selected, "PPP", {
                                                locale,
                                              })
                                            : "Selecione uma data"}
                                          <IconChevronDown className="ml-auto h-4 w-4" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent
                                        className="w-auto p-0"
                                        align="start"
                                      >
                                        <Calendar
                                          mode="single"
                                          selected={selected}
                                          onSelect={(next) => {
                                            field.onChange(next ?? null);
                                            setIsEndDatePopoverOpen(false);
                                          }}
                                          defaultMonth={
                                            selected ??
                                            form.getValues("startDate") ??
                                            dateRange.to
                                          }
                                          locale={locale}
                                        />
                                      </PopoverContent>
                                    </Popover>
                                  </FormControl>
                                </FormItem>
                              );
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>

                  {/* === Payment Section === */}
                  <section className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Controle o status de pagamento e a data real de
                      recebimento desta receita.
                    </p>
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="isPaid"
                        render={({ field }) => (
                          <FormItem className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(checked) =>
                                    field.onChange(Boolean(checked))
                                  }
                                  disabled={isSubmitting}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-medium">
                                Marcar como recebida
                              </FormLabel>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <AnimatePresence initial={false}>
                        {isPaidValue && (
                          <motion.div key="paid-at" {...motionProps}>
                            <FormField
                              control={form.control}
                              name="paidAt"
                              render={({ field }) => {
                                const selected = field.value;
                                return (
                                  <FormItem>
                                    <FormLabel>Data de pagamento</FormLabel>
                                    <FormControl>
                                      <Popover
                                        open={isPaidAtPopoverOpen}
                                        onOpenChange={setIsPaidAtPopoverOpen}
                                      >
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="outline"
                                            className={cn(
                                              "w-full justify-start text-left font-normal",
                                              !selected &&
                                                "text-muted-foreground",
                                            )}
                                            disabled={isSubmitting}
                                          >
                                            <IconCalendar className="mr-2 h-4 w-4" />
                                            {selected
                                              ? format(selected, "PPP", {
                                                  locale,
                                                })
                                              : "Selecione a data de pagamento"}
                                            <IconChevronDown className="ml-auto h-4 w-4" />
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                          className="w-auto p-0"
                                          align="start"
                                        >
                                          <Calendar
                                            mode="single"
                                            selected={selected}
                                            onSelect={(next) => {
                                              if (next) {
                                                field.onChange(next);
                                                setIsPaidAtPopoverOpen(false);
                                              }
                                            }}
                                            defaultMonth={
                                              selected ??
                                              form.getValues("date") ??
                                              dateRange.to
                                            }
                                            locale={locale}
                                          />
                                        </PopoverContent>
                                      </Popover>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                );
                              }}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </section>

                  {/* === Details Section === */}
                  <section className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Forneça as informações principais para acompanhar e
                      reportar esta receita.
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldCurrencyAmount
                        control={form.control}
                        amountName="amount"
                        currencyName="currency"
                        label="Valor"
                        required
                      />
                      <FormField
                        control={form.control}
                        name="accountId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Conta <span className="text-destructive">*</span>
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              onOpenChange={(openState) =>
                                !openState && field.onBlur()
                              }
                              value={field.value}
                              disabled={
                                accountsQuery.isLoading ||
                                !hasAccounts ||
                                isSubmitting
                              }
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue
                                    placeholder={
                                      accountsQuery.isLoading
                                        ? "Carregando contas..."
                                        : hasAccounts
                                          ? "Selecione uma conta"
                                          : "Nenhuma conta cadastrada"
                                    }
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {accountsQuery.data?.map((account) => (
                                  <SelectItem
                                    key={account.id}
                                    value={account.id}
                                  >
                                    {account.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Descrição</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="ex.: Salário, freelancer, bônus..."
                                autoComplete="off"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="method"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Forma de pagamento</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={isSubmitting}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Selecione uma forma" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {paymentMethodOptions.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categoria</FormLabel>
                            <FormControl>
                              <CategoriesSelect
                                type="income"
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </section>

                  {/* === Extras Section === */}
                  <section className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Adicione detalhes opcionais ou informações de apoio para
                      esta receita.
                    </p>
                    <FormField
                      control={form.control}
                      name="attachmentUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Comprovante (URL)</FormLabel>
                          <FormControl>
                            <Input
                              type="url"
                              placeholder="https://example.com/receipt"
                              {...field}
                              value={field.value ?? ""}
                              disabled={isFormDisabled || isSubmitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </section>
                </div>
              </ScrollArea>

              {/* === Footer === */}
              <div className="sm:px-4 px-4 py-4 rounded-b-lg">
                <div className="flex sm:flex-row flex-col gap-4">
                  {!isEditing && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={keepOpenId}
                        checked={keepOpen}
                        onCheckedChange={(value) => setKeepOpen(Boolean(value))}
                        disabled={isSubmitting}
                      />
                      <FormLabel
                        htmlFor={keepOpenId}
                        className="text-sm text-muted-foreground whitespace-nowrap"
                      >
                        Manter aberto
                      </FormLabel>
                    </div>
                  )}
                  <DialogFooter className="flex w-full flex-col-reverse gap-2 px-0 sm:flex-row sm:items-center sm:justify-end">
                    <DialogClose asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 sm:flex-none"
                        disabled={isSubmitting}
                      >
                        Cancelar
                      </Button>
                    </DialogClose>
                    <Button
                      type="submit"
                      className="flex-1 sm:flex-none"
                      disabled={isSubmitting || isFormDisabled}
                      isLoading={isSubmitting}
                    >
                      {isEditing ? "Salvar alterações" : "Criar"}
                    </Button>
                  </DialogFooter>
                </div>
              </div>
            </form>
          </Form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
