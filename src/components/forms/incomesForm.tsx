"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconCalendar, IconChevronDown, IconPlus } from "@tabler/icons-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import { formatCentsBRL, parseCurrencyToCents } from "@/helpers/formatCurrency";
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
  label: string;
}> = [
  { value: "pix", label: "Pix" },
  { value: "transfer", label: "Transfer" },
  { value: "debit", label: "Debit" },
  { value: "credit", label: "Credit" },
  { value: "cash", label: "Cash" },
  { value: "boleto", label: "Boleto" },
  { value: "investment", label: "Investment" },
];

const createIncomeFormSchema = z.object({
  description: z.string().min(1, "Enter a description."),
  amount: z.number().int().min(1, "Enter an amount greater than zero."),
  date: z.date(),
  accountId: z.string().uuid("Select an account."),
  categoryId: z.string().uuid("Select a category."),
  method: z.enum(paymentMethodValues),
  attachmentUrl: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || isValidUrl(value),
      "Enter a valid URL.",
    ),
  // 👇 novos campos
  mode: z.enum(["unique", "installment", "recurring"]),
  totalInstallments: z.number().int().min(2).optional(),
  recurrenceType: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

type CreateIncomeFormValues = z.infer<typeof createIncomeFormSchema>;

const getDefaultValues = (): CreateIncomeFormValues => ({
  description: "",
  amount: 0,
  date: new Date(),
  accountId: "",
  categoryId: "",
  method: "pix",
  attachmentUrl: "",
  mode: "unique",
});

function isValidUrl(value: string) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function IncomesForm() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = React.useState(false);
  const [isStartDatePopoverOpen, setIsStartDatePopoverOpen] =
    React.useState(false);
  const [isEndDatePopoverOpen, setIsEndDatePopoverOpen] = React.useState(false);
  const [keepOpen, setKeepOpen] = React.useState(false);
  const keepOpenId = React.useId();
  const dateRange = useDateStore((state) => state.dateRange);
  const utils = trpc.useUtils();
  const keepOpenRef = React.useRef(keepOpen);
  const defaultDateRef = React.useRef(new Date());

  React.useEffect(() => {
    keepOpenRef.current = keepOpen;
  }, [keepOpen]);

  React.useEffect(() => {
    defaultDateRef.current = new Date();
  }, [dateRange.to]);

  const form = useForm<CreateIncomeFormValues>({
    resolver: zodResolver(createIncomeFormSchema),
    defaultValues: getDefaultValues(),
    mode: "onSubmit",
  });

  const accountsQuery = trpc.accounts.list.useQuery(undefined, {
    enabled: isOpen,
  });

  const createIncomeMutation = trpc.transactions.create.useMutation({
    onSuccess: async () => {
      await utils.transactions.list.invalidate({ type: "income" });
      toast.success("Income successfully registered.");
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
    onError: (error) => {
      toast.error(error.message ?? "Could not register the income.");
    },
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
      const attachmentUrl =
        values.attachmentUrl && values.attachmentUrl.trim().length > 0
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
        mode: values.mode, // 👈 novo
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
  const isInstallment = mode === "installment";
  const isRecurring = mode === "recurring";
  const conditionalMotionProps = {
    initial: { opacity: 0, y: -10, height: 0 },
    animate: { opacity: 1, y: 0, height: "auto" },
    exit: { opacity: 0, y: -10, height: 0 },
    transition: { duration: 0.25, ease: "easeInOut" },
  } as const;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button icon={<IconPlus className="size-4" />}>Create Income</Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[calc(100vh-4rem)] flex-col gap-0 p-0 sm:max-w-3xl">
        <motion.div
          layout
          transition={{ layout: { duration: 0.24, ease: "easeInOut" } }}
          className="flex flex-1 flex-col"
        >
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-1 flex-col min-h-0"
            >
              <div className="px-6 pt-6 pb-4 space-y-4">
                <DialogHeader className="px-0 text-left">
                  <DialogTitle>Create Income</DialogTitle>
                  <DialogDescription>
                    Fill in the information below to create an income entry.
                  </DialogDescription>
                </DialogHeader>

                <FormField
                  control={form.control}
                  name="mode"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">
                        Transaction type
                      </FormLabel>
                      <FormControl>
                        <Tabs
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(
                              value as CreateIncomeFormValues["mode"],
                            );
                            field.onBlur();
                          }}
                          className="w-full"
                        >
                          <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted/60 p-1">
                            <TabsTrigger className="rounded-lg" value="unique">
                              Unique
                            </TabsTrigger>
                            <TabsTrigger
                              className="rounded-lg"
                              value="installment"
                            >
                              Installment
                            </TabsTrigger>
                            <TabsTrigger
                              className="rounded-lg"
                              value="recurring"
                            >
                              Recurring
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-1 flex-col px-6 pb-6">
                <div className="flex-1 flex flex-col min-h-0">
                  <ScrollArea className="flex-1 min-h-0 max-h-9/12 pr-2">
                    <motion.div
                      layout
                      transition={{
                        layout: { duration: 0.18, ease: "easeInOut" },
                      }}
                      className="grid gap-6 pb-6 md:grid-cols-2"
                    >
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => {
                          const selectedDate = field.value;

                          return (
                            <FormItem className="md:col-span-1">
                              <FormLabel>Received date</FormLabel>
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
                                      disabled={isFormDisabled || isSubmitting}
                                    >
                                      <IconCalendar className="mr-2 h-4 w-4" />
                                      {selectedDate
                                        ? format(selectedDate, "PPP", {
                                            locale: ptBR,
                                          })
                                        : "Select a date"}
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
                                      onSelect={(nextDate) => {
                                        if (nextDate) {
                                          field.onChange(nextDate);
                                          setIsDatePopoverOpen(false);
                                        }
                                      }}
                                      defaultMonth={
                                        selectedDate ?? dateRange.to
                                      }
                                      initialFocus
                                      locale={ptBR}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                      <AnimatePresence initial={false} mode="sync">
                        {isInstallment ? (
                          <motion.div
                            key="installment-fields"
                            layout
                            className="md:col-span-1"
                            style={{ overflow: "hidden" }}
                            {...conditionalMotionProps}
                          >
                            <FormField
                              control={form.control}
                              name="totalInstallments"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Total installments</FormLabel>
                                  <FormControl>
                                    <NumberInputCounter
                                      value={field.value}
                                      onChange={(nextValue) =>
                                        field.onChange(nextValue)
                                      }
                                      onBlur={field.onBlur}
                                      name={field.name}
                                      ref={field.ref}
                                      minValue={2}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </motion.div>
                        ) : null}
                      </AnimatePresence>

                      <AnimatePresence initial={false} mode="sync">
                        {isRecurring ? (
                          <motion.div
                            key="recurring-fields"
                            layout
                            className="md:col-span-2 grid gap-6 md:grid-cols-3"
                            style={{ overflow: "hidden" }}
                            {...conditionalMotionProps}
                          >
                            <FormField
                              control={form.control}
                              name="recurrenceType"
                              render={({ field }) => (
                                <FormItem className="md:col-span-1">
                                  <FormLabel>Recurrence</FormLabel>
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    onOpenChange={(open) =>
                                      !open && field.onBlur()
                                    }
                                  >
                                    <FormControl>
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select frequency" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="daily">
                                        Daily
                                      </SelectItem>
                                      <SelectItem value="weekly">
                                        Weekly
                                      </SelectItem>
                                      <SelectItem value="monthly">
                                        Monthly
                                      </SelectItem>
                                      <SelectItem value="yearly">
                                        Yearly
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="startDate"
                              render={({ field }) => {
                                const selectedStartDate =
                                  field.value ?? undefined;

                                return (
                                  <FormItem className="md:col-span-1">
                                    <FormLabel>Start date</FormLabel>
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
                                              !selectedStartDate &&
                                                "text-muted-foreground",
                                            )}
                                          >
                                            <IconCalendar className="mr-2 h-4 w-4" />
                                            {selectedStartDate
                                              ? format(
                                                  selectedStartDate,
                                                  "PPP",
                                                  {
                                                    locale: ptBR,
                                                  },
                                                )
                                              : "Select a date"}
                                            <IconChevronDown className="ml-auto h-4 w-4" />
                                          </Button>
                                        </PopoverTrigger>

                                        <PopoverContent
                                          className="w-auto p-0"
                                          align="start"
                                        >
                                          <Calendar
                                            mode="single"
                                            selected={selectedStartDate}
                                            onSelect={(nextDate) => {
                                              if (nextDate) {
                                                field.onChange(nextDate);
                                                setIsStartDatePopoverOpen(
                                                  false,
                                                );
                                              }
                                            }}
                                            defaultMonth={
                                              selectedStartDate ?? dateRange.to
                                            }
                                            initialFocus
                                            locale={ptBR}
                                          />
                                        </PopoverContent>
                                      </Popover>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                );
                              }}
                            />

                            <FormField
                              control={form.control}
                              name="endDate"
                              render={({ field }) => {
                                const selectedEndDate =
                                  field.value ?? undefined;

                                return (
                                  <FormItem className="md:col-span-1">
                                    <FormLabel>End date (optional)</FormLabel>
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
                                              !selectedEndDate &&
                                                "text-muted-foreground",
                                            )}
                                          >
                                            <IconCalendar className="mr-2 h-4 w-4" />
                                            {selectedEndDate
                                              ? format(selectedEndDate, "PPP", {
                                                  locale: ptBR,
                                                })
                                              : "Select a date"}
                                            <IconChevronDown className="ml-auto h-4 w-4" />
                                          </Button>
                                        </PopoverTrigger>

                                        <PopoverContent
                                          className="w-auto p-0"
                                          align="start"
                                        >
                                          <Calendar
                                            mode="single"
                                            selected={selectedEndDate}
                                            onSelect={(nextDate) => {
                                              field.onChange(nextDate ?? null);
                                              setIsEndDatePopoverOpen(false);
                                            }}
                                            defaultMonth={
                                              selectedEndDate ??
                                              form.getValues("startDate") ??
                                              dateRange.to
                                            }
                                            initialFocus
                                            locale={ptBR}
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
                        ) : null}
                      </AnimatePresence>
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem className="md:col-span-1">
                            <FormLabel>
                              Amount <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                value={formatCentsBRL(Number(field.value ?? 0))}
                                onChange={(event) => {
                                  const cents = parseCurrencyToCents(
                                    event.target.value,
                                  );
                                  field.onChange(cents);
                                }}
                                onBlur={field.onBlur}
                                inputMode="numeric"
                                disabled={isFormDisabled || isSubmitting}
                              />
                            </FormControl>
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
                              Description{" "}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g.: Salary, freelance, bonus..."
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
                        name="accountId"
                        render={({ field }) => (
                          <FormItem className="md:col-span-1">
                            <FormLabel>
                              Account{" "}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              onOpenChange={(open) => {
                                if (!open) {
                                  field.onBlur();
                                }
                              }}
                              value={field.value}
                              disabled={accountsQuery.isLoading || !hasAccounts}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue
                                    placeholder={
                                      accountsQuery.isLoading
                                        ? "Loading accounts..."
                                        : hasAccounts
                                          ? "Select an account"
                                          : "No account registered"
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
                        name="method"
                        render={({ field }) => (
                          <FormItem className="md:col-span-1">
                            <FormLabel>Payment Method</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              onOpenChange={(open) => {
                                if (!open) {
                                  field.onBlur();
                                }
                              }}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select a method" />
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
                          <FormItem className="md:col-span-2">
                            <FormLabel>
                              Category{" "}
                              <span className="text-destructive">*</span>
                            </FormLabel>
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

                      <FormField
                        control={form.control}
                        name="attachmentUrl"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Receipt (URL)</FormLabel>
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
                    </motion.div>
                  </ScrollArea>
                  <div className="flex flex-col gap-4 border-t border-border/60 pt-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={keepOpenId}
                        checked={keepOpen}
                        onCheckedChange={(value) => setKeepOpen(Boolean(value))}
                        disabled={isSubmitting}
                      />
                      <FormLabel
                        htmlFor={keepOpenId}
                        className="text-sm text-muted-foreground"
                      >
                        Keep open
                      </FormLabel>
                    </div>
                    <DialogFooter className="flex w-full flex-row items-center gap-2 px-0 sm:justify-end">
                      <DialogClose asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 sm:flex-none"
                          disabled={isSubmitting}
                        >
                          Cancel
                        </Button>
                      </DialogClose>
                      <Button
                        type="submit"
                        className="flex-1 sm:flex-none"
                        disabled={isSubmitting || isFormDisabled}
                        isLoading={isSubmitting}
                      >
                        Create
                      </Button>
                    </DialogFooter>
                  </div>
                </div>
              </div>
            </form>
          </Form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
