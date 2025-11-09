"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconCalendar, IconChevronDown, IconPlus } from "@tabler/icons-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
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

const createIncomeFormSchema = (t: TFunction<"incomes">) =>
  z.object({
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
    recurrenceType: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
  });

type CreateIncomeFormValues = z.infer<
  ReturnType<typeof createIncomeFormSchema>
>;

const getDefaultValues = (): CreateIncomeFormValues => ({
  description: "",
  amount: 0,
  currency: "BRL",
  date: new Date(),
  accountId: "",
  categoryId: "",
  method: "pix",
  attachmentUrl: "",
  mode: "unique",
  totalInstallments: 2,
  recurrenceType: "monthly",
});

function isValidUrl(value: string) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function IncomesForm() {
  const { t, i18n } = useTranslation("incomes");
  const [isOpen, setIsOpen] = React.useState(false);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = React.useState(false);
  const [isStartDatePopoverOpen, setIsStartDatePopoverOpen] =
    React.useState(false);
  const [isEndDatePopoverOpen, setIsEndDatePopoverOpen] = React.useState(false);
  const [keepOpen, setKeepOpen] = React.useState(false);
  const keepOpenId = React.useId();

  const locale = React.useMemo(
    () => (i18n.language?.startsWith("pt") ? ptBR : enUS),
    [i18n.language],
  );

  const schema = React.useMemo(() => createIncomeFormSchema(t), [t]);

  const dateRange = useDateStore((state) => state.dateRange);
  const utils = trpc.useUtils();
  const keepOpenRef = React.useRef(keepOpen);

  React.useEffect(() => {
    keepOpenRef.current = keepOpen;
  }, [keepOpen]);

  const form = useForm<CreateIncomeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(),
    mode: "onSubmit",
  });

  const accountsQuery = trpc.accounts.list.useQuery(undefined, {
    enabled: isOpen,
  });

  const createIncomeMutation = trpc.transactions.create.useMutation({
    onSuccess: async () => {
      await utils.transactions.list.invalidate({ type: "income" });
      toast.success(t("form.toast.success"));
      form.reset(getDefaultValues());
      setIsDatePopoverOpen(false);
      setIsStartDatePopoverOpen(false);
      setIsEndDatePopoverOpen(false);
      if (keepOpenRef.current) {
        form.setFocus("description");
      } else {
        setIsOpen(false);
      }
    },
    onError: (error) => toast.error(error.message ?? t("form.toast.error")),
  });

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      setIsOpen(nextOpen);
      if (!nextOpen) {
        form.reset(getDefaultValues());
        setIsDatePopoverOpen(false);
        setIsStartDatePopoverOpen(false);
        setIsEndDatePopoverOpen(false);
        setKeepOpen(false);
      }
    },
    [form],
  );

  const onSubmit = React.useCallback(
    (values: CreateIncomeFormValues) => {
      const amountInCents = values.amount;
      const attachmentUrl = values.attachmentUrl?.trim().length
        ? values.attachmentUrl.trim()
        : undefined;
      createIncomeMutation.mutate({
        type: "income",
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
      });
    },
    [createIncomeMutation],
  );

  const isSubmitting = createIncomeMutation.isPending;
  const hasAccounts = (accountsQuery.data?.length ?? 0) > 0;
  const isFormDisabled = !hasAccounts;

  const mode = form.watch("mode");
  const isUnique = mode === "unique";
  const isInstallment = mode === "installment";
  const isRecurring = mode === "recurring";

  const motionProps = {
    initial: { opacity: 0, y: -10, height: 0 },
    animate: { opacity: 1, y: 0, height: "auto" },
    exit: { opacity: 0, y: -10, height: 0 },
    transition: { duration: 0.25, ease: "easeInOut" },
  } as const;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button icon={<IconPlus className="size-4" />}>
          {t("form.trigger")}
        </Button>
      </DialogTrigger>

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
                  <DialogTitle>{t("form.title")}</DialogTitle>
                  <DialogDescription>{t("form.description")}</DialogDescription>
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
                          value={field.value}
                          onValueChange={(value) =>
                            field.onChange(
                              value as CreateIncomeFormValues["mode"],
                            )
                          }
                          className="w-full"
                        >
                          <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted/60 p-1">
                            <TabsTrigger value="unique" className="rounded-lg">
                              {t("form.mode.unique")}
                            </TabsTrigger>
                            <TabsTrigger
                              value="installment"
                              className="rounded-lg"
                            >
                              {t("form.mode.installment")}
                            </TabsTrigger>
                            <TabsTrigger
                              value="recurring"
                              className="rounded-lg"
                            >
                              {t("form.mode.recurring")}
                            </TabsTrigger>
                          </TabsList>
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
                              onOpenChange={(open) => !open && field.onBlur()}
                              value={field.value}
                              disabled={accountsQuery.isLoading || !hasAccounts}
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
                                type="income"
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                              />
                            </FormControl>
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
                        </FormItem>
                      )}
                    />
                  </section>
                </div>
              </ScrollArea>

              {/* === Footer === */}
              <div className="sm:px-4 px-4 py-4 rounded-b-lg">
                <div className="flex sm:flex-row flex-col gap-4">
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
                      {t("form.submit")}
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
