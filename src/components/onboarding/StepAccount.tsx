"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconArrowRight, IconChevronLeft } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FieldCurrencyAmount } from "@/components/FieldCurrencyAmount";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { formSchema } from "@/hooks/useOnboardingController";

export function StepAccount({
  onNext,
  onBack,
  isLoading,
}: {
  onNext: (data: z.infer<typeof formSchema>) => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
}) {
  // Extend schema locally to add "currency" field for reusability
  const schemaWithCurrency = formSchema.extend({
    currency: z.enum(["BRL", "USD"]),
  });

  const form = useForm<z.infer<typeof schemaWithCurrency>>({
    resolver: zodResolver(schemaWithCurrency),
    defaultValues: {
      name: "",
      type: "checking",
      initialBalance: 0,
      currency: "BRL",
    },
  });

  const onSubmit = async (values: z.infer<typeof schemaWithCurrency>) => {
    const payload = {
      name: values.name,
      type: values.type,
      initialBalance: values.initialBalance,
    };
    await onNext(payload);
  };

  return (
    <div className="max-w-[480px] space-y-6">
      <DialogHeader>
        <DialogTitle>Vamos configurar sua primeira conta</DialogTitle>
        <DialogDescription>
          Informe o nome, tipo e saldo inicial para começar.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Nome da conta */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da conta</FormLabel>
                <FormControl>
                  <input
                    type="text"
                    placeholder="Ex: Nubank, Bradesco..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Campo de saldo inicial com moeda */}
          <FieldCurrencyAmount
            control={form.control}
            amountName="initialBalance"
            currencyName="currency"
            label="Saldo inicial"
          />
          {/* Tipo de conta */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de conta</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  defaultValue="checking"
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="checking">Conta bancária</SelectItem>
                    <SelectItem value="credit">Cartão de crédito</SelectItem>
                    <SelectItem value="investment">
                      Conta de investimento
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Ações */}
          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={onBack}>
              <IconChevronLeft className="mr-2 size-4" />
              Voltar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Próximo"}
              <IconArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
