"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconCalendar, IconChevronDown, IconPlus } from "@tabler/icons-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { CategoriesSelect } from "@/components/Selects/CategoriesSelect";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { formatCentsBRL, parseCurrencyToCents } from "@/helpers/formatCurrency";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { useDateStore } from "@/stores/useDateStore";
import { Checkbox } from "../ui/checkbox";

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

const getDefaultValues = (date: Date): CreateIncomeFormValues => ({
  description: "",
  amount: 0,
  date: new Date(date),
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
  const [keepOpen, setKeepOpen] = React.useState(false);
  const keepOpenId = React.useId();
  const dateRange = useDateStore((state) => state.dateRange);
  const utils = trpc.useUtils();
  const keepOpenRef = React.useRef(keepOpen);
  const defaultDateRef = React.useRef(dateRange.to);

  React.useEffect(() => {
    keepOpenRef.current = keepOpen;
  }, [keepOpen]);

  React.useEffect(() => {
    defaultDateRef.current = dateRange.to;
  }, [dateRange.to]);

  const form = useForm<CreateIncomeFormValues>({
    resolver: zodResolver(createIncomeFormSchema),
    defaultValues: getDefaultValues(dateRange.to),
    mode: "onSubmit",
  });

  const accountsQuery = trpc.accounts.list.useQuery(undefined, {
    enabled: isOpen,
  });

  const createIncomeMutation = trpc.transactions.create.useMutation({
    onSuccess: async () => {
      await utils.transactions.list.invalidate({ type: "income" });
      toast.success("Income successfully registered.");
      form.reset(getDefaultValues(defaultDateRef.current));
      setIsDatePopoverOpen(false);

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
        form.reset(getDefaultValues(defaultDateRef.current));
        setIsDatePopoverOpen(false);
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

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button icon={<IconPlus className="size-4" />}>Create Income</Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col px-4">
        <SheetHeader className="px-0">
          <SheetTitle> Create Income </SheetTitle>
          <SheetDescription>
            Fill in the information below to create an income entry.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1"
          >
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => {
                  const selectedDate = field.value;

                  return (
                    <FormItem>
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
                                !selectedDate && "text-muted-foreground",
                              )}
                              disabled={isFormDisabled || isSubmitting}
                            >
                              <IconCalendar className="mr-2 h-4 w-4" />
                              {selectedDate
                                ? format(selectedDate, "PPP", { locale: ptBR })
                                : "Select a date"}
                              <IconChevronDown className="ml-auto h-4 w-4" />
                            </Button>
                          </PopoverTrigger>

                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={(nextDate) => {
                                if (nextDate) {
                                  field.onChange(nextDate);
                                  setIsDatePopoverOpen(false);
                                }
                              }}
                              defaultMonth={selectedDate ?? dateRange.to}
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
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      onOpenChange={(open) => !open && field.onBlur()}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unique">Unique</SelectItem>
                        <SelectItem value="installment">Installment</SelectItem>
                        <SelectItem value="recurring">Recurring</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Campos extras condicionais */}
              {form.watch("mode") === "installment" && (
                <FormField
                  control={form.control}
                  name="totalInstallments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total installments</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={2}
                          placeholder="Number of installments"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {form.watch("mode") === "recurring" && (
                <>
                  <FormField
                    control={form.control}
                    name="recurrenceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recurrence</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          onOpenChange={(open) => !open && field.onBlur()}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={
                              field.value
                                ? format(field.value, "yyyy-MM-dd")
                                : ""
                            }
                            onChange={(e) =>
                              field.onChange(new Date(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End date (optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={
                              field.value
                                ? format(field.value, "yyyy-MM-dd")
                                : ""
                            }
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? new Date(e.target.value)
                                  : null,
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
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
                  <FormItem>
                    <FormLabel>
                      Description <span className="text-destructive">*</span>
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
                  <FormItem>
                    <FormLabel>
                      Account <span className="text-destructive">*</span>
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
                          <SelectItem key={account.id} value={account.id}>
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
                  <FormItem>
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
                          <SelectItem key={option.value} value={option.value}>
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
                    <FormLabel>
                      Category <span className="text-destructive">*</span>
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
                  <FormItem>
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
            </div>
            <SheetFooter className="flex flex-row items-center gap-2 px-0">
              <SheetClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </SheetClose>
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting || isFormDisabled}
                isLoading={isSubmitting}
              >
                Create
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
