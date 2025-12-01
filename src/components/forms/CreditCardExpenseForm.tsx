"use client";

import { Tab, Tabs } from "@heroui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconCalendar, IconChevronDown, IconPlus } from "@tabler/icons-react";
import { addMonths, format, setDate, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import { Checkbox } from "../ui/checkbox";
import { ScrollArea } from "../ui/scroll-area";

type CreditCardExpenseFormMode = "unique" | "installment";

type CreditCardExpenseFormProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  defaultCreditCardId?: string | null;
};

const createCreditCardExpenseSchema = () =>
  z.object({
    description: z.string().min(1, "Informe uma descrição."),
    amount: z.number().int().min(1, "Informe um valor maior que zero."),
    currency: z.enum(["BRL", "USD"]),
    date: z.date(),
    creditCardId: z.string().min(1, "Selecione um cartão de crédito."),
    categoryId: z.string().min(1, "Selecione uma categoria."),
    attachmentUrl: z
      .string()
      .trim()
      .refine(
        (value) => value.length === 0 || isValidUrl(value),
        "Informe uma URL válida.",
      )
      .optional(),
    mode: z.enum(["unique", "installment"]),
    totalInstallments: z
      .number()
      .int()
      .min(2, "Informe pelo menos duas parcelas.")
      .optional(),
  });

type CreditCardExpenseFormValues = z.infer<
  ReturnType<typeof createCreditCardExpenseSchema>
>;

const getDefaultValues = (
  overrides?: Partial<CreditCardExpenseFormValues>,
): CreditCardExpenseFormValues => {
  const now = new Date();

  return {
    description: "",
    amount: 0,
    currency: "BRL",
    date: now,
    creditCardId: "",
    categoryId: "",
    attachmentUrl: "",
    mode: "unique",
    totalInstallments: 2,
    ...overrides,
  };
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

export function CreditCardExpenseForm(props: CreditCardExpenseFormProps = {}) {
  const { open, onOpenChange, trigger, onSuccess, defaultCreditCardId } = props;

  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = React.useState(false);
  const [keepOpen, setKeepOpen] = React.useState(false);
  const keepOpenId = React.useId();
  const keepOpenRef = React.useRef(keepOpen);

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? Boolean(open) : internalOpen;

  const locale = ptBR;
  const schema = React.useMemo(() => createCreditCardExpenseSchema(), []);
  const utils = trpc.useUtils();

  const form = useForm<CreditCardExpenseFormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues({
      creditCardId: defaultCreditCardId ?? "",
    }),
    mode: "onSubmit",
  });

  React.useEffect(() => {
    keepOpenRef.current = keepOpen;
  }, [keepOpen]);

  React.useEffect(() => {
    if (dialogOpen && defaultCreditCardId) {
      const currentId = form.getValues("creditCardId");
      if (!currentId) {
        form.setValue("creditCardId", defaultCreditCardId);
      }
    }
  }, [dialogOpen, defaultCreditCardId, form]);

  const closeDialog = React.useCallback(() => {
    if (!isControlled) {
      setInternalOpen(false);
    }
    onOpenChange?.(false);
    setIsDatePopoverOpen(false);

    form.reset(getDefaultValues({ creditCardId: defaultCreditCardId ?? "" }));
    setKeepOpen(false);
  }, [form, isControlled, onOpenChange, defaultCreditCardId]);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        if (!isControlled) setInternalOpen(true);
        onOpenChange?.(true);
        return;
      }
      closeDialog();
    },
    [closeDialog, isControlled, onOpenChange],
  );

  const creditCardsQuery = trpc.creditCards.list.useQuery(undefined, {
    enabled: dialogOpen,
  });

  const hasCreditCards = (creditCardsQuery.data?.length ?? 0) > 0;
  const creditCardId = form.watch("creditCardId");
  const dateValue = form.watch("date");
  const amount = form.watch("amount");
  const modeValue = form.watch("mode");

  const isInstallment = modeValue === "installment";

  const selectedCard = React.useMemo(() => {
    return creditCardsQuery.data?.find((card) => card.id === creditCardId);
  }, [creditCardsQuery.data, creditCardId]);

  const estimatedDueDate = React.useMemo(() => {
    if (!selectedCard || !dateValue) return null;
    const closingDay = selectedCard.closing_day;
    const dueDay = selectedCard.due_day;

    if (!closingDay || !dueDay) return null;

    const purchaseDate = startOfDay(dateValue);
    let dueDate = setDate(purchaseDate, dueDay);

    // Logic: if purchase is AFTER closing day, it goes to NEXT month's bill (due in 2 months approx)
    // If BEFORE or ON closing day, it goes to THIS month's bill (due next month approx)
    if (purchaseDate.getDate() > closingDay) {
      dueDate = addMonths(dueDate, 2);
    } else {
      dueDate = addMonths(dueDate, 1);
    }
    return dueDate;
  }, [selectedCard, dateValue]);

  const showCreditCardDetail = !!selectedCard;

  const createExpenseMutation = trpc.transactions.create.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.transactions.list.invalidate({ type: "expense" }),
        utils.transactions.metrics.invalidate(),
        utils.creditCards.list.invalidate(), // Invalidate credit cards to update limits
      ]);

      toast.success("Compra registrada com sucesso.");

      if (keepOpenRef.current) {
        form.reset(getDefaultValues({ creditCardId: creditCardId }));
        form.setFocus("description");
      } else {
        closeDialog();
      }
      onSuccess?.();
    },
    onError: (error) =>
      toast.error(error.message ?? "Não foi possível registrar a compra."),
  });

  const isSubmitting = createExpenseMutation.isPending;

  const onSubmit = React.useCallback(
    (values: CreditCardExpenseFormValues) => {
      const amountInCents = values.amount;
      const attachmentUrl = values.attachmentUrl?.trim().length
        ? values.attachmentUrl.trim()
        : undefined;

      const payload = {
        type: "expense" as const,
        method: "credit" as const,
        amount: amountInCents / 100,
        description: values.description,
        date: values.date,
        categoryId: values.categoryId,
        creditCardId: values.creditCardId,
        attachmentUrl,
        mode: values.mode,
        totalInstallments: values.totalInstallments,
        isPaid: false, // Credit card purchases are debts, not paid immediately from bank account
      };

      createExpenseMutation.mutate(payload);
    },
    [createExpenseMutation],
  );

  const motionProps = {
    initial: { opacity: 0, y: -10, height: 0 },
    animate: { opacity: 1, y: 0, height: "auto" },
    exit: { opacity: 0, y: -10, height: 0 },
    transition: { duration: 0.25, ease: "easeInOut" },
  } as const;

  const triggerNode = trigger ?? (
    <Button icon={<IconPlus className="size-4" />}>Nova Despesa</Button>
  );

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{triggerNode}</DialogTrigger>

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
                    <DialogTitle>Nova compra no cartão</DialogTitle>
                    <DialogDescription>
                      Registre uma nova despesa no seu cartão de crédito.
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
                            onSelectionChange={(value) =>
                              field.onChange(value as CreditCardExpenseFormMode)
                            }
                            fullWidth
                          >
                            <Tab key="unique" title="À Vista" />
                            <Tab key="installment" title="Parcelada" />
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
                    {/* Date Field */}
                    <section className="space-y-2">
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {isInstallment
                                ? "Data da compra / 1ª parcela"
                                : "Data da compra"}
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
                                      !field.value && "text-muted-foreground",
                                    )}
                                    disabled={isSubmitting}
                                  >
                                    <IconCalendar className="mr-2 h-4 w-4" />
                                    {field.value
                                      ? format(field.value, "PPP", { locale })
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
                                    selected={field.value}
                                    onSelect={(next) => {
                                      if (next) {
                                        field.onChange(next);
                                        setIsDatePopoverOpen(false);
                                      }
                                    }}
                                    locale={locale}
                                  />
                                </PopoverContent>
                              </Popover>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <AnimatePresence>
                        {isInstallment && (
                          <motion.div {...motionProps}>
                            <FormField
                              control={form.control}
                              name="totalInstallments"
                              render={({ field }) => (
                                <FormItem className="mt-4">
                                  <FormLabel>Número de parcelas</FormLabel>
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
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </section>

                    {/* Details Section */}
                    <section className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <FieldCurrencyAmount
                          control={form.control}
                          amountName="amount"
                          currencyName="currency"
                          label="Valor da compra"
                          required
                        />

                        <FormField
                          control={form.control}
                          name="creditCardId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Cartão{" "}
                                <span className="text-destructive">*</span>
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
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
                                          ? "Carregando..."
                                          : hasCreditCards
                                            ? "Selecione o cartão"
                                            : "Nenhum cartão"
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

                              {/* Mobile Card Stats (Hidden on Desktop) */}
                              {selectedCard && (
                                <div className="mt-2 text-xs text-muted-foreground space-y-1 rounded-md bg-muted/50 p-2 md:hidden">
                                  <div className="flex justify-between">
                                    <span>Disponível:</span>
                                    <span
                                      className={cn(
                                        Number(selectedCard.available_limit) < 0
                                          ? "text-destructive"
                                          : "text-emerald-600",
                                      )}
                                    >
                                      {formatCurrency(
                                        Number(selectedCard.available_limit),
                                        selectedCard.currency as "BRL" | "USD",
                                      )}
                                    </span>
                                  </div>
                                  {estimatedDueDate && (
                                    <div className="flex justify-between pt-1 border-t border-border/50">
                                      <span>Vencimento est.:</span>
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

                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Descrição</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="ex.: Supermercado, Uber, Eletrônicos..."
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
                          name="categoryId"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
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

                    {/* Extras Section */}
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
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </section>
                  </div>
                </ScrollArea>

                {/* Footer */}
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
                        Manter aberto
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
                          Cancelar
                        </Button>
                      </DialogClose>
                      <Button
                        type="submit"
                        className="flex-1 sm:flex-none"
                        disabled={isSubmitting || !hasCreditCards}
                        isLoading={isSubmitting}
                      >
                        Registrar Compra
                      </Button>
                    </DialogFooter>
                  </div>
                </div>
              </form>

              {/* Desktop Card Detail Panel */}
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
                        currency={selectedCard.currency as "BRL" | "USD"}
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
