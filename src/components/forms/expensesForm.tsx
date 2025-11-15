"use client";

import { Tab, Tabs } from "@heroui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconCalendar, IconChevronDown, IconPlus } from "@tabler/icons-react";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import type { TFunction } from "i18next";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
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
  labelKey: `form.paymentMethods.${PaymentMethodValue}`;
}> = [
  { value: "pix", labelKey: "form.paymentMethods.pix" },
  { value: "transfer", labelKey: "form.paymentMethods.transfer" },
  { value: "debit", labelKey: "form.paymentMethods.debit" },
  { value: "credit", labelKey: "form.paymentMethods.credit" },
  { value: "cash", labelKey: "form.paymentMethods.cash" },
  { value: "boleto", labelKey: "form.paymentMethods.boleto" },
  { value: "investment", labelKey: "form.paymentMethods.investment" },
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
};

const createExpenseFormSchema = (t: TFunction<"expenses">) =>
  z
    .object({
      description: z.string().min(1, t("form.validation.description")),
      amount: z.number().int().min(1, t("form.validation.amount")),
      currency: z.enum(["BRL", "USD", "EUR"]),
      date: z.date(),
      accountId: z.string().uuid(t("form.validation.account")),
      categoryId: z.string().uuid(t("form.validation.category")),
      method: z.enum(paymentMethodValues),
      attachmentUrl: z
        .string()
        .trim()
        .refine(
          (value) => value.length === 0 || isValidUrl(value),
          t("form.validation.attachment"),
        ),
      mode: z.enum(["unique", "installment", "recurring"]),
      totalInstallments: z
        .number()
        .int()
        .min(2, t("form.validation.totalInstallments"))
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
          message: t("form.validation.paidAt"),
        });
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
  } = props;

  const hasExpense = Boolean(expense);
  const derivedMode: ExpenseFormMode =
    forcedMode ?? (hasExpense ? "edit" : "create");
  const isEditing = derivedMode === "edit" && hasExpense;
  const effectiveExpense = isEditing ? expense : null;

  const { t, i18n } = useTranslation("expenses");
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

  const locale = React.useMemo(
    () => (i18n.language?.startsWith("pt") ? ptBR : enUS),
    [i18n.language],
  );

  const schema = React.useMemo(() => createExpenseFormSchema(t), [t]);

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

  const invalidateTransactionsData = React.useCallback(async () => {
    await Promise.all([
      utils.transactions.list.invalidate({ type: "expense" }),
      utils.transactions.metrics.invalidate(),
    ]);
  }, [utils]);

  const createExpenseMutation = trpc.transactions.create.useMutation({
    onSuccess: async () => {
      await invalidateTransactionsData();
      toast.success(t("form.toast.success"));
      if (keepOpenRef.current) {
        form.reset(getDefaultValues());
        form.setFocus("description");
      } else {
        closeDialog();
      }
      onSuccess?.();
    },
    onError: (error) => toast.error(error.message ?? t("form.toast.error")),
  });

  const updateExpenseMutation = trpc.transactions.update.useMutation({
    onSuccess: async () => {
      await invalidateTransactionsData();
      toast.success(t("form.toast.updateSuccess"));
      closeDialog();
      onSuccess?.();
    },
    onError: (error) =>
      toast.error(error.message ?? t("form.toast.updateError")),
  });

  const isSubmitting = isEditing
    ? updateExpenseMutation.isPending
    : createExpenseMutation.isPending;
  const hasAccounts = (accountsQuery.data?.length ?? 0) > 0;
  const isFormDisabled = !hasAccounts;

  const modeValue = form.watch("mode");
  const isUnique = modeValue === "unique";
  const isInstallment = modeValue === "installment";
  const isRecurring = modeValue === "recurring";
  const dateValue = form.watch("date");

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
      <Button icon={<IconPlus className="size-4" />}>
        {t("form.trigger")}
      </Button>
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
                    {isEditing ? t("form.editTitle") : t("form.title")}
                  </DialogTitle>
                  <DialogDescription>
                    {isEditing
                      ? t("form.editDescription")
                      : t("form.description")}
                  </DialogDescription>
                </DialogHeader>

                {/* Mode Tabs */}
                <FormField
                  control={form.control}
                  name="mode"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">
                        {t("form.mode.label")}
                      </FormLabel>
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
                            title={t("form.mode.unique")}
                          />
                          <Tab
                            key="installment"
                            disabled={isEditing}
                            title={t("form.mode.installment")}
                          />
                          <Tab
                            key="recurring"
                            disabled={isEditing}
                            title={t("form.mode.recurring")}
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
                      {t("form.dates.help")}
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
                                  <FormLabel>
                                    {t("form.dates.receivedDate")}
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
                                            : t("form.dates.selectDate")}
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
                                    {t("form.dates.firstInstallment")}
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
                                            : t("form.dates.selectDate")}
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
                                <FormLabel>
                                  {t("form.dates.totalInstallments")}
                                </FormLabel>
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
                                  {t("form.dates.recurring.frequencyLabel")}
                                </FormLabel>
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue
                                        placeholder={t(
                                          "form.dates.recurring.frequencyPlaceholder",
                                        )}
                                      />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="daily">
                                      {t("form.dates.recurring.daily")}
                                    </SelectItem>
                                    <SelectItem value="weekly">
                                      {t("form.dates.recurring.weekly")}
                                    </SelectItem>
                                    <SelectItem value="monthly">
                                      {t("form.dates.recurring.monthly")}
                                    </SelectItem>
                                    <SelectItem value="yearly">
                                      {t("form.dates.recurring.yearly")}
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
                                  <FormLabel>
                                    {t("form.dates.recurring.startDate")}
                                  </FormLabel>
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
                                            : t("form.dates.selectDate")}
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
                                    {t("form.dates.recurring.endDate")}
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
                                            : t("form.dates.selectDate")}
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
                    <p className="text-xs text-muted-foreground">
                      {t("form.details.help")}
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldCurrencyAmount
                        control={form.control}
                        amountName="amount"
                        currencyName="currency"
                        label={t("form.details.amount")}
                        required
                      />
                      <FormField
                        control={form.control}
                        name="accountId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("form.details.account")}{" "}
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
                                        ? t("form.details.accountLoading")
                                        : hasAccounts
                                          ? t("form.details.accountPlaceholder")
                                          : t("form.details.accountEmpty")
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
                            <FormLabel>
                              {t("form.details.description")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t(
                                  "form.details.descriptionPlaceholder",
                                )}
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
                            <FormLabel>{t("form.details.method")}</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={isSubmitting}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue
                                    placeholder={t(
                                      "form.details.methodPlaceholder",
                                    )}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {paymentMethodOptions.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {t(option.labelKey)}
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
                            <FormLabel>{t("form.details.category")}</FormLabel>
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
                    <p className="text-xs text-muted-foreground">
                      {t("form.extras.help")}
                    </p>
                    <FormField
                      control={form.control}
                      name="attachmentUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("form.extras.receipt")}</FormLabel>
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
                        {t("form.keepOpen")}
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
                        {t("form.cancel")}
                      </Button>
                    </DialogClose>
                    <Button
                      type="submit"
                      className="flex-1 sm:flex-none"
                      disabled={isSubmitting || isFormDisabled}
                      isLoading={isSubmitting}
                    >
                      {t(isEditing ? "form.update" : "form.submit")}
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
