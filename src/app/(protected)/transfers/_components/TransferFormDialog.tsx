"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconArrowRight,
  IconArrowsExchange,
  IconCalendar,
  IconLoader2,
  IconPlus,
} from "@tabler/icons-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { FieldCurrencyAmount } from "@/components/FieldCurrencyAmount";
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
} from "@/components/ui/select";
import { formatCurrency } from "@/helpers/formatCurrency";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

import type { TransferTableRow } from "./columnsDef";

const transferSchema = z
  .object({
    date: z.coerce.date(),
    fromAccountId: z
      .string()
      .min(1, "Selecione a conta de origem")
      .uuid("Selecione a conta de origem"),
    toAccountId: z
      .string()
      .min(1, "Selecione a conta de destino")
      .uuid("Selecione a conta de destino"),
    amount: z.number(),
    currency: z.enum(["BRL", "USD"]).default("BRL"),
    description: z.string().max(500, "Máximo 500 caracteres").optional(),
  })
  .superRefine((data, ctx) => {
    if (Number.isNaN(data.amount)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amount"],
        message: "Valor é obrigatório",
      });
    } else if (!(data.amount > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amount"],
        message: "Valor deve ser maior que zero",
      });
    }

    if (!(data.date instanceof Date) || Number.isNaN(data.date.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["date"],
        message: "Data inválida",
      });
    }
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    path: ["toAccountId"],
    message: "As contas devem ser diferentes",
  });

type TransferFormValues = z.infer<typeof transferSchema>;

type TransferFormDialogProps = {
  mode?: "create" | "edit";
  transfer?: TransferTableRow | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => Promise<void> | void;
  trigger?: React.ReactNode;
};

// Animation variants
const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (i: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        delay: i * 0.2,
        type: "spring" as const,
        duration: 1.5,
        bounce: 0.2,
        ease: [0.22, 1, 0.36, 1],
      },
      opacity: { delay: i * 0.2, duration: 0.3 },
    },
  }),
};

function Checkmark({
  size = 100,
  strokeWidth = 2,
  color = "currentColor",
  className = "",
}: {
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
}) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      initial="hidden"
      animate="visible"
      className={className}
    >
      <title>Checkmark</title>
      <motion.circle
        cx="50"
        cy="50"
        r="42"
        stroke={color}
        variants={draw as never}
        custom={0}
        style={{
          strokeWidth,
          strokeLinecap: "round",
          fill: "transparent",
        }}
      />
      <motion.path
        d="M32 50L45 63L68 35"
        stroke={color}
        variants={draw as never}
        custom={1}
        style={{
          strokeWidth: strokeWidth + 0.5,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          fill: "transparent",
        }}
      />
    </motion.svg>
  );
}

export function TransferFormDialog({
  mode = "create",
  transfer,
  open,
  onOpenChange,
  onSuccess,
  trigger,
}: TransferFormDialogProps) {
  const isEditing = mode === "edit" && Boolean(transfer);
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? Boolean(open) : internalOpen;
  const [isCompleted, setIsCompleted] = useState(false);

  const accountsQuery = trpc.accounts.list.useQuery(undefined, {
    enabled: dialogOpen,
  });

  const defaultValues: TransferFormValues = {
    date: transfer?.date ? new Date(transfer.date) : new Date(),
    fromAccountId: transfer?.fromAccountId ?? "",
    toAccountId: transfer?.toAccountId ?? "",
    amount:
      transfer && typeof transfer.amount === "number"
        ? Math.round(transfer.amount * 100)
        : 0,
    currency: "BRL",
    description: transfer?.description ?? "",
  };

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema) as Resolver<TransferFormValues>,
    defaultValues,
  });

  useEffect(() => {
    if (dialogOpen) {
      form.reset(defaultValues);
      setIsCompleted(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, transfer?.id]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
    if (!nextOpen) {
      form.reset(defaultValues);
      setIsCompleted(false);
    }
  };

  const utils = trpc.useUtils();

  const createMutation = trpc.transactions.createTransfer.useMutation({
    onSuccess: async () => {
      setIsCompleted(true);
      toast.success("Transferência criada com sucesso!");
      await utils.bankAccounts.list.invalidate();
      await onSuccess?.();
      setTimeout(() => handleOpenChange(false), 2000);
    },
    onError: (err) => {
      toast.error(err.message ?? "Erro ao criar transferência");
    },
  });

  const updateMutation = trpc.transactions.updateTransfer.useMutation({
    onSuccess: async () => {
      setIsCompleted(true);
      toast.success("Transferência atualizada com sucesso!");
      await utils.bankAccounts.list.invalidate();
      await onSuccess?.();
      setTimeout(() => handleOpenChange(false), 2000);
    },
    onError: (err) => {
      toast.error(err.message ?? "Erro ao atualizar transferência");
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const amountInDecimal = values.amount / 100;

    const payload = {
      date: values.date,
      fromAccountId: values.fromAccountId,
      toAccountId: values.toAccountId,
      amount: amountInDecimal,
      description: values.description?.trim()
        ? values.description.trim()
        : undefined,
    };

    if (isEditing && transfer) {
      await updateMutation.mutateAsync({
        id: transfer.id,
        ...payload,
      });
      return;
    }

    await createMutation.mutateAsync(payload);
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const accounts = accountsQuery.data ?? [];

  const renderTrigger = trigger ?? (
    <Button size="sm" className="gap-2">
      <IconPlus className="size-4" />
      Nova Transferência
    </Button>
  );

  const selectedFromAccount = accounts.find(
    (a) => a.id === form.watch("fromAccountId"),
  );
  const selectedToAccount = accounts.find(
    (a) => a.id === form.watch("toAccountId"),
  );

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{renderTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-0 bg-transparent shadow-none">
        <div className="bg-background border rounded-xl shadow-xl overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="sr-only">
              {isEditing ? "Editar Transferência" : "Nova Transferência"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {isEditing
                ? "Edite os detalhes da transferência"
                : "Preencha os detalhes da nova transferência"}
            </DialogDescription>

            <div className="flex items-center justify-center pb-4">
              <div className="relative w-[80px] h-[80px] flex items-center justify-center">
                <motion.div
                  className="absolute inset-0 blur-2xl bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0.8] }}
                  transition={{
                    duration: 1.5,
                    times: [0, 0.5, 1],
                    ease: [0.22, 1, 0.36, 1],
                    repeat: Infinity,
                  }}
                />
                <AnimatePresence mode="wait">
                  {!isCompleted ? (
                    <motion.div
                      key="progress"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, rotate: 360 }}
                      transition={{ duration: 0.6 }}
                      className="w-[80px] h-[80px] flex items-center justify-center"
                    >
                      <div className="relative z-10">
                        {isSubmitting && (
                          <motion.div
                            className="absolute inset-0 rounded-full border-2 border-transparent"
                            style={{
                              borderLeftColor: "rgb(16 185 129)",
                              borderTopColor: "rgb(16 185 129 / 0.2)",
                            }}
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          />
                        )}
                        <div className="relative z-10 bg-background rounded-full p-4 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                          <IconArrowsExchange
                            className={cn(
                              "h-8 w-8",
                              isSubmitting
                                ? "text-emerald-500"
                                : "text-muted-foreground",
                            )}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="completed"
                      initial={{ opacity: 0, rotate: -180 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      className="w-[80px] h-[80px] flex items-center justify-center"
                    >
                      <Checkmark size={80} color="rgb(16 185 129)" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-semibold tracking-tight ">
                {isCompleted
                  ? "Transferência Concluída"
                  : isSubmitting
                    ? "Processando..."
                    : isEditing
                      ? "Editar Transferência"
                      : "Nova Transferência"}
              </h2>
              {!isCompleted && !isSubmitting && (
                <p className="text-sm text-muted-foreground">
                  Informe os detalhes da transferência abaixo
                </p>
              )}
            </div>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-0">
              <div className="p-6 space-y-4">
                {/* Accounts: Responsive grid - vertical on mobile, horizontal on desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_32px_1fr] gap-3 sm:gap-4 sm:items-end">
                  <FormField
                    control={form.control}
                    name="fromAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>De</FormLabel>
                        <Select
                          disabled={
                            accountsQuery.isLoading ||
                            isSubmitting ||
                            isCompleted
                          }
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="h-16! w-full">
                            <div className="flex items-center gap-2.5 w-full text-left">
                              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold shrink-0">
                                {selectedFromAccount?.currency === "BRL"
                                  ? "R$"
                                  : "$"}
                              </div>
                              <div className="flex flex-col items-start min-w-0 flex-1">
                                <span className="font-medium text-sm truncate w-full">
                                  {selectedFromAccount
                                    ? selectedFromAccount.name
                                    : "Selecione uma conta"}
                                </span>
                                {selectedFromAccount && (
                                  <span className="text-[11px] text-muted-foreground">
                                    Saldo:{" "}
                                    {formatCurrency(
                                      selectedFromAccount.current_balance ?? 0,
                                      selectedFromAccount.currency as
                                        | "BRL"
                                        | "USD",
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">
                                    {account.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatCurrency(
                                      account.current_balance ?? 0,
                                      account.currency as "BRL" | "USD",
                                    )}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Arrow Icon - rotates on mobile */}
                  <div className="flex items-center justify-center sm:mb-3">
                    <div className="bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full p-1.5 text-emerald-600 dark:text-emerald-400 rotate-90 sm:rotate-0">
                      <IconArrowRight className="size-4" />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="toAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Para</FormLabel>
                        <Select
                          disabled={
                            accountsQuery.isLoading ||
                            isSubmitting ||
                            isCompleted
                          }
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="h-16! w-full">
                            <div className="flex items-center gap-2.5 w-full text-left">
                              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold shrink-0">
                                {selectedToAccount?.currency === "BRL"
                                  ? "R$"
                                  : "$"}
                              </div>
                              <div className="flex flex-col items-start min-w-0 flex-1">
                                <span className="font-medium text-sm truncate w-full">
                                  {selectedToAccount
                                    ? selectedToAccount.name
                                    : "Selecione uma conta"}
                                </span>
                                {selectedToAccount && (
                                  <span className="text-[11px] text-muted-foreground">
                                    Saldo:{" "}
                                    {formatCurrency(
                                      selectedToAccount.current_balance ?? 0,
                                      selectedToAccount.currency as
                                        | "BRL"
                                        | "USD",
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">
                                    {account.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatCurrency(
                                      account.current_balance ?? 0,
                                      account.currency as "BRL" | "USD",
                                    )}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldCurrencyAmount
                    control={form.control}
                    amountName="amount"
                    currencyName="currency"
                    label="Valor"
                    disabled={isSubmitting || isCompleted}
                    required
                  />

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              disabled={isSubmitting || isCompleted}
                              className={cn(
                                "justify-start gap-2 h-9 w-full",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              <IconCalendar className="size-4" />
                              {field.value
                                ? format(field.value, "P", { locale: ptBR })
                                : "Selecione a data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="p-0 w-fit">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) =>
                                field.onChange(date ?? new Date())
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <Input
                        placeholder="Descrição opcional"
                        disabled={isSubmitting || isCompleted}
                        {...field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="flex w-full p-6 flex-col-reverse gap-2  sm:flex-row sm:items-center sm:justify-end">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting || isCompleted}
                  >
                    Cancelar
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={isSubmitting || isCompleted}
                  className={cn(
                    "gap-2",
                    isCompleted && "bg-emerald-500 hover:bg-emerald-600",
                  )}
                >
                  {isSubmitting && (
                    <IconLoader2 className="size-4 animate-spin" />
                  )}
                  {isCompleted
                    ? "Concluído"
                    : isEditing
                      ? "Salvar"
                      : "Transferir"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
