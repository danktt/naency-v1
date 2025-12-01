"use client";

import { Tab, Tabs } from "@heroui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconCalendar, IconChevronDown, IconPlus } from "@tabler/icons-react";
import type { inferRouterOutputs } from "@trpc/server";
import { addMonths, format, setDate, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
// ... existing imports ...
import { CreditCardDetail } from "@/components/CreditCardDetail";
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
import { formatCurrency } from "@/helpers/formatCurrency";
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
type ExpenseTransaction = RouterOutput["transactions"]["list"][number];
type ExpenseFormMode = "create" | "edit";

type ExpensesFormProps = {
  mode?: ExpenseFormMode;
  expense?: ExpenseTransaction | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  excludeCreditCard?: boolean;
};

const createExpenseFormSchema = () =>
  z
    .object({
      description: z.string().min(1, "Informe uma descrição."),
      amount: z.number().int().min(1, "Informe um valor maior que zero."),
      currency: z.enum(["BRL", "USD", "EUR"]),
      date: z.date(),
      accountId: z.string().optional(),
      creditCardId: z.string().optional(),
      categoryId: z.string().min(1, "Selecione uma categoria."),
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

      if (data.method === "credit") {
        if (!data.creditCardId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["creditCardId"],
            message: "Selecione um cartão de crédito.",
          });
        }
      } else {
        if (!data.accountId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["accountId"],
            message: "Selecione uma conta.",
          });
        }
      }
    });

type CreateExpenseFormValues = z.infer<
  ReturnType<typeof createExpenseFormSchema>
>;

const getDefaultValues = (
  overrides?: Partial<CreateExpenseFormValues>,
): CreateExpenseFormValues => {
  const now = new Date();
  const mode = overrides?.mode ?? "unique";
  const date = overrides?.date ?? now;
  const inferredIsPaid = overrides?.isPaid ?? mode === "unique";

  const values: CreateExpenseFormValues = {
    description: "",
    amount: 0,
    currency: "BRL",
    date,
    accountId: "",
    creditCardId: "",
    categoryId: "",
    method: "pix",
    attachmentUrl: "",
    mode,
    totalInstallments: 2,
    recurrenceType: "monthly",
    isPaid: inferredIsPaid,
    paidAt: overrides?.paidAt ?? (inferredIsPaid ? date : undefined),
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

function mapExpenseToDefaultValues(
  expense: ExpenseTransaction,
): CreateExpenseFormValues {
  const mode = expense.installmentGroupId
    ? "installment"
    : expense.recurringId
      ? "recurring"
      : "unique";

  const amountInCents = Math.round(Number(expense.amount) * 100);

  return getDefaultValues({
    description: expense.description,
    amount: Number.isNaN(amountInCents) ? 0 : amountInCents,
    date: expense.date ? new Date(expense.date) : new Date(),
    accountId: expense.accountId ?? "",
    creditCardId: expense.creditCardId ?? "",
    categoryId: expense.categoryId ?? "",
    method: expense.method,
    attachmentUrl: expense.attachmentUrl ?? "",
    mode,
    totalInstallments: expense.totalInstallments ?? 2,
    isPaid: expense.isPaid ?? false,
    paidAt: expense.paidAt ? new Date(expense.paidAt) : undefined,
  });
}

export function ExpensesForm(props: ExpensesFormProps = {}) {
  const {
    mode: forcedMode,
    expense = null,
    open,
    onOpenChange,
    trigger,
    onSuccess,
    excludeCreditCard,
  } = props;

  const filteredPaymentMethods = React.useMemo(() => {
    if (excludeCreditCard) {
      return paymentMethodOptions.filter((m) => m.value !== "credit");
    }
    return paymentMethodOptions;
  }, [excludeCreditCard]);

  const hasExpense = Boolean(expense);
  const derivedMode: ExpenseFormMode =
    forcedMode ?? (hasExpense ? "edit" : "create");
  const isEditing = derivedMode === "edit" && hasExpense;
  const effectiveExpense = isEditing ? expense : null;

  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = React.useState(false);
  const [isStartDatePopoverOpen, setIsStartDatePopoverOpen] =
    React.useState(false);
  const [isEndDatePopoverOpen, setIsEndDatePopoverOpen] = React.useState(false);
  const [keepOpen, setKeepOpen] = React.useState(false);
  const keepOpenId = React.useId();
  const keepOpenRef = React.useRef(keepOpen);

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? Boolean(open) : internalOpen;

  const locale = ptBR;

  const schema = React.useMemo(() => createExpenseFormSchema(), []);

  const dateRange = useDateStore((state) => state.dateRange);
  const utils = trpc.useUtils();

  const defaultValues = React.useMemo(() => {
    if (isEditing && effectiveExpense) {
      return mapExpenseToDefaultValues(effectiveExpense);
    }
    return getDefaultValues();
  }, [effectiveExpense, isEditing]);

  const form = useForm<CreateExpenseFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onSubmit",
  });

  React.useEffect(() => {
    keepOpenRef.current = keepOpen;
  }, [keepOpen]);

  React.useEffect(() => {
    if (dialogOpen && isEditing && effectiveExpense) {
      form.reset(mapExpenseToDefaultValues(effectiveExpense));
    }
  }, [dialogOpen, effectiveExpense, isEditing, form]);

  const closeDialog = React.useCallback(() => {
    if (!isControlled) {
      setInternalOpen(false);
    }
    onOpenChange?.(false);
    setIsDatePopoverOpen(false);
    setIsStartDatePopoverOpen(false);
    setIsEndDatePopoverOpen(false);

    if (isEditing && effectiveExpense) {
      form.reset(mapExpenseToDefaultValues(effectiveExpense));
    } else {
      form.reset(getDefaultValues());
      setKeepOpen(false);
    }
  }, [effectiveExpense, form, isControlled, isEditing, onOpenChange]);

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

  const creditCardsQuery = trpc.creditCards.list.useQuery(undefined, {
    enabled: dialogOpen,
  });

  const hasAccounts = (accountsQuery.data?.length ?? 0) > 0;
  const hasCreditCards = (creditCardsQuery.data?.length ?? 0) > 0;
  const method = form.watch("method");
  const creditCardId = form.watch("creditCardId");
  const dateValue = form.watch("date");
  const amount = form.watch("amount");

  const selectedCard = React.useMemo(() => {
    return creditCardsQuery.data?.find((card) => card.id === creditCardId);
  }, [creditCardsQuery.data, creditCardId]);

  const estimatedDueDate = React.useMemo(() => {
    if (!selectedCard || !dateValue) return null;
    const closingDay = selectedCard.closing_day;
    const dueDay = selectedCard.due_day;

    if (!closingDay || !dueDay) return null;

    const purchaseDate = startOfDay(dateValue);

    // Se a data da compra for antes ou igual ao dia de fechamento, a fatura é do mês atual (vencimento no próximo mês)
    // Se for depois, a fatura é do próximo mês (vencimento em 2 meses)
    // Nota: Isso é uma simplificação. O fechamento geralmente pega compras até o dia X.
    // Se fechamento é 25. Compra dia 20 -> Fatura fecha dia 25 -> Vence dia 5 (prox mes).
    // Compra dia 26 -> Fatura fecha dia 25 (do prox mes) -> Vence dia 5 (2 meses).

    let dueDate = setDate(purchaseDate, dueDay);

    // Se a compra for feita APÓS o fechamento, ela só entra na fatura seguinte
    if (purchaseDate.getDate() > closingDay) {
      dueDate = addMonths(dueDate, 2);
    } else {
      dueDate = addMonths(dueDate, 1);
    }

    return dueDate;
  }, [selectedCard, dateValue]);

  const showCreditCardDetail = method === "credit" && !!selectedCard;

  const invalidateTransactionsData = React.useCallback(async () => {
    await Promise.all([
      utils.transactions.list.invalidate({ type: "expense" }),
      utils.transactions.metrics.invalidate(),
      utils.bankAccounts.list.invalidate(),
    ]);
  }, [utils]);

  const createExpenseMutation = trpc.transactions.create.useMutation({
    onSuccess: async () => {
      await invalidateTransactionsData();
      toast.success("Despesa registrada com sucesso.");
      if (keepOpenRef.current) {
        form.reset(getDefaultValues());
        form.setFocus("description");
      } else {
        closeDialog();
      }
      onSuccess?.();
    },
    onError: (error) =>
      toast.error(error.message ?? "Não foi possível registrar a despesa."),
  });

  const updateExpenseMutation = trpc.transactions.update.useMutation({
    onSuccess: async () => {
      await invalidateTransactionsData();
      toast.success("Despesa atualizada com sucesso.");
      closeDialog();
      onSuccess?.();
    },
    onError: (error) =>
      toast.error(error.message ?? "Não foi possível atualizar a despesa."),
  });

  const isSubmitting = isEditing
    ? updateExpenseMutation.isPending
    : createExpenseMutation.isPending;
  const isFormDisabled = method === "credit" ? !hasCreditCards : !hasAccounts;

  const modeValue = form.watch("mode");
  const isUnique = modeValue === "unique";
  const isInstallment = modeValue === "installment";
  const isRecurring = modeValue === "recurring";

  React.useEffect(() => {
    if (!dialogOpen || isEditing) {
      return;
    }

    if (modeValue === "unique") {
      form.setValue("isPaid", true, { shouldDirty: false });
      form.setValue("paidAt", dateValue, { shouldDirty: false });
    } else {
      form.setValue("isPaid", false, { shouldDirty: false });
      form.setValue("paidAt", undefined, { shouldDirty: false });
    }
  }, [dateValue, dialogOpen, form, isEditing, modeValue]);

  const onSubmit = React.useCallback(
    (values: CreateExpenseFormValues) => {
      const amountInCents = values.amount;
      const attachmentUrl = values.attachmentUrl?.trim().length
        ? values.attachmentUrl.trim()
        : undefined;
      const shouldAutoMarkPaid = !isEditing && values.mode === "unique";
      const isPaid = shouldAutoMarkPaid ? true : values.isPaid;
      const paidAt = shouldAutoMarkPaid
        ? values.date
        : values.isPaid
          ? (values.paidAt ?? values.date)
          : undefined;

      const payload = {
        type: "expense" as const,
        accountId:
          values.method === "credit"
            ? undefined
            : values.accountId || undefined,
        creditCardId:
          values.method === "credit"
            ? values.creditCardId || undefined
            : undefined,
        categoryId: values.categoryId || undefined,
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
        isPaid,
        paidAt,
      };

      if (isEditing && effectiveExpense) {
        updateExpenseMutation.mutate({
          ...payload,
          id: effectiveExpense.id,
        });
      } else {
        createExpenseMutation.mutate(payload);
      }
    },
    [createExpenseMutation, effectiveExpense, isEditing, updateExpenseMutation],
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
      <Button icon={<IconPlus className="size-4" />}>Criar despesa</Button>
    );

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {triggerNode ? (
        <DialogTrigger asChild>{triggerNode}</DialogTrigger>
      ) : null}

      <DialogContent
        className={cn(
          "flex w-full flex-col p-0 transition-all duration-300",
          "max-h-[90vh] sm:max-h-[calc(100vh-4rem)]",
          showCreditCardDetail ? "sm:max-w-5xl" : "sm:max-w-3xl",
        )}
      >
        <motion.div layout className="flex flex-1 overflow-hidden">
          <Form {...form}>
            <div className="flex flex-1 min-h-0">
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-1 flex-col min-h-0"
              >
                {/* Header */}
                <div className="sm:px-4 px-4 pt-6 pb-4 space-y-4 shrink-0">
                  <DialogHeader className="px-0 text-left">
                    <DialogTitle>
                      {isEditing ? "Editar despesa" : "Criar despesa"}
                    </DialogTitle>
                    <DialogDescription>
                      {isEditing
                        ? "Atualize as informações abaixo para editar esta despesa."
                        : "Preencha as informações abaixo para registrar uma despesa."}
                    </DialogDescription>
                  </DialogHeader>

                  {/* Mode Tabs */}
                  <FormField
                    control={form.control}
                    name="mode"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormControl>
                          <Tabs
                            selectedKey={field.value}
                            onSelectionChange={(value) => {
                              if (isEditing) return;
                              field.onChange(
                                value as CreateExpenseFormValues["mode"],
                              );
                            }}
                            fullWidth
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
                                    <FormLabel>Data de pagamento</FormLabel>
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
                                  <FormLabel>
                                    Frequência da recorrência
                                  </FormLabel>
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
                                              ? format(selected, "PP", {
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
                                                setIsStartDatePopoverOpen(
                                                  false,
                                                );
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
                                              ? format(selected, "PP", {
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
                                    <FormMessage />
                                  </FormItem>
                                );
                              }}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </section>

                    {/* === Details Section === */}
                    <section className="space-y-2">
                      <div className="grid gap-4 md:grid-cols-2">
                        <FieldCurrencyAmount
                          control={form.control}
                          amountName="amount"
                          currencyName="currency"
                          label="Valor"
                          required
                        />
                        {method === "credit" ? (
                          <FormField
                            control={form.control}
                            name="creditCardId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  Cartão de crédito{" "}
                                  <span className="text-destructive">*</span>
                                </FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  onOpenChange={(openState) =>
                                    !openState && field.onBlur()
                                  }
                                  value={field.value}
                                  disabled={
                                    creditCardsQuery.isLoading ||
                                    !hasCreditCards ||
                                    isSubmitting
                                  }
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue
                                        placeholder={
                                          creditCardsQuery.isLoading
                                            ? "Carregando cartões..."
                                            : hasCreditCards
                                              ? "Selecione um cartão"
                                              : "Nenhum cartão cadastrado"
                                        }
                                      />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {creditCardsQuery.data?.map((card) => (
                                      <SelectItem key={card.id} value={card.id}>
                                        {card.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                                {selectedCard && (
                                  <div className="mt-2 text-xs text-muted-foreground space-y-1 rounded-md bg-muted/50 p-2 md:hidden">
                                    <div className="flex justify-between">
                                      <span>Limite disponível:</span>
                                      <span
                                        className={cn(
                                          Number(selectedCard.available_limit) <
                                            0
                                            ? "text-destructive"
                                            : "text-emerald-600",
                                        )}
                                      >
                                        {formatCurrency(
                                          Number(selectedCard.available_limit),
                                          selectedCard.currency as
                                            | "BRL"
                                            | "USD",
                                        )}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Limite total:</span>
                                      <span>
                                        {formatCurrency(
                                          Number(selectedCard.credit_limit),
                                          selectedCard.currency as
                                            | "BRL"
                                            | "USD",
                                        )}
                                      </span>
                                    </div>
                                    {estimatedDueDate && (
                                      <div className="flex justify-between pt-1 border-t border-border/50">
                                        <span>Previsão de débito:</span>
                                        <span className="font-medium text-primary">
                                          {format(
                                            estimatedDueDate,
                                            "dd/MM/yyyy",
                                            { locale },
                                          )}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </FormItem>
                            )}
                          />
                        ) : (
                          <FormField
                            control={form.control}
                            name="accountId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  Conta{" "}
                                  <span className="text-destructive">*</span>
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
                        )}
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Descrição</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="ex.: Aluguel, contas, fornecedores..."
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
                                  {filteredPaymentMethods.map((option) => (
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
                                  type="expense"
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
                          onCheckedChange={(value) =>
                            setKeepOpen(Boolean(value))
                          }
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
              <AnimatePresence>
                {showCreditCardDetail && selectedCard && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 320, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="hidden md:block border-l bg-muted/10 overflow-hidden"
                  >
                    <div className="w-[320px] h-full overflow-y-auto">
                      <CreditCardDetail
                        name={selectedCard.name}
                        brand={selectedCard.brand}
                        creditLimit={Number(selectedCard.credit_limit)}
                        availableLimit={Number(selectedCard.available_limit)}
                        currency={
                          selectedCard.currency as "BRL" | "USD" | "EUR"
                        }
                        closingDay={selectedCard.closing_day}
                        dueDay={selectedCard.due_day}
                        transactionAmount={amount ? amount / 100 : 0}
                        className="h-full"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
