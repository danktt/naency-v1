"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { CategoriesSelect } from "@/components/Selects/CategoriesSelect";
import { Button } from "@/components/ui/button";
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
import { trpc } from "@/lib/trpc/client";

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

const createIncomeFormSchema = z.object({
  description: z.string().min(1, "Informe uma descrição."),
  amount: z.string().min(1, "Informe um valor."),
  date: z.string().min(1, "Informe a data."),
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
});

type CreateIncomeFormValues = z.infer<typeof createIncomeFormSchema>;

const getDefaultValues = (): CreateIncomeFormValues => ({
  description: "",
  amount: "",
  date: formatDateInput(new Date()),
  accountId: "",
  categoryId: "",
  method: "pix",
  attachmentUrl: "",
});

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseAmount(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  return Number.parseFloat(normalized);
}

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
  const utils = trpc.useUtils();

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
      toast.success("Receita registrada com sucesso.");
      form.reset(getDefaultValues());
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error(error.message ?? "Não foi possível registrar a receita.");
    },
  });

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      setIsOpen(nextOpen);
      if (!nextOpen) {
        form.reset(getDefaultValues());
      }
    },
    [form],
  );

  const onSubmit = React.useCallback(
    (values: CreateIncomeFormValues) => {
      const parsedAmount = parseAmount(values.amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        form.setError("amount", {
          message: "Informe um valor maior que zero.",
        });
        return;
      }

      const parsedDate = new Date(values.date);
      if (Number.isNaN(parsedDate.getTime())) {
        form.setError("date", {
          message: "Informe uma data válida.",
        });
        return;
      }

      const attachmentUrl =
        values.attachmentUrl && values.attachmentUrl.trim().length > 0
          ? values.attachmentUrl.trim()
          : undefined;

      createIncomeMutation.mutate({
        type: "income",
        accountId: values.accountId,
        categoryId: values.categoryId,
        amount: parsedAmount,
        description: values.description,
        date: parsedDate,
        method: values.method,
        attachmentUrl,
      });
    },
    [createIncomeMutation, form],
  );

  const isSubmitting = createIncomeMutation.isPending;
  const hasAccounts = (accountsQuery.data?.length ?? 0) > 0;
  const isFormDisabled = !hasAccounts;

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button icon={<IconPlus className="size-4" />}>
          Registrar receita
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Registrar receita</SheetTitle>
          <SheetDescription>
            Preencha os dados abaixo para lançar uma entrada de receita.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col gap-6 overflow-y-auto px-1 py-6"
          >
            <div className="grid gap-6">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex.: Salário, freelance, bônus..."
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0,00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conta</FormLabel>
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
                          <SelectTrigger>
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
                      <FormLabel>Método de recebimento</FormLabel>
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
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um método" />
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
              </div>

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
                        className="w-full"
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
                    <FormLabel>Comprovante (URL)</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://exemplo.com/comprovante"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <SheetFooter className="mt-auto gap-2 sm:gap-4">
              <SheetClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancelar
                </Button>
              </SheetClose>
              <Button
                type="submit"
                disabled={isSubmitting || isFormDisabled}
                isLoading={isSubmitting}
              >
                Registrar
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
