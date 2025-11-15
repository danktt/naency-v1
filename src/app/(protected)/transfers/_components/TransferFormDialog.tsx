"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconCalendar, IconLoader2, IconPlus } from "@tabler/icons-react";
import { format } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";
import * as React from "react";
import { type Resolver, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
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
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

import type { TransferTableRow } from "./columnsDef";

const transferSchema = (t: ReturnType<typeof useTranslation>["t"]) =>
  z
    .object({
      date: z.coerce.date(),
      fromAccountId: z
        .string()
        .min(1, t("form.validation.fromAccount"))
        .uuid(t("form.validation.fromAccount")),
      toAccountId: z
        .string()
        .min(1, t("form.validation.toAccount"))
        .uuid(t("form.validation.toAccount")),
      amount: z.number(),
      description: z
        .string()
        .max(500, t("form.validation.descriptionMax"))
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (Number.isNaN(data.amount)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["amount"],
          message: t("form.validation.amount"),
        });
      } else if (!(data.amount > 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["amount"],
          message: t("form.validation.amountPositive"),
        });
      }

      if (!(data.date instanceof Date) || Number.isNaN(data.date.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["date"],
          message: t("form.validation.date"),
        });
      }
    })
    .refine((data) => data.fromAccountId !== data.toAccountId, {
      path: ["toAccountId"],
      message: t("form.validation.sameAccount"),
    });

type TransferFormValues = z.infer<ReturnType<typeof transferSchema>>;

type TransferFormDialogProps = {
  mode?: "create" | "edit";
  transfer?: TransferTableRow | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => Promise<void> | void;
  trigger?: React.ReactNode;
};

export function TransferFormDialog({
  mode = "create",
  transfer,
  open,
  onOpenChange,
  onSuccess,
  trigger,
}: TransferFormDialogProps) {
  const { t, i18n } = useTranslation("transfers");
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const fallbackLng =
    (Array.isArray(i18n.options?.fallbackLng) && i18n.options.fallbackLng[0]) ||
    (typeof i18n.options?.fallbackLng === "string"
      ? i18n.options.fallbackLng
      : "en");

  const fallbackT = React.useMemo(
    () => i18n.getFixedT(fallbackLng, "transfers"),
    [i18n, fallbackLng],
  );

  const translate = isMounted ? t : fallbackT;

  const isEditing = mode === "edit" && Boolean(transfer);
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? Boolean(open) : internalOpen;

  const locale = React.useMemo(
    () =>
      (isMounted ? (i18n.language ?? fallbackLng) : fallbackLng).startsWith(
        "pt",
      )
        ? ptBR
        : enUS,
    [fallbackLng, i18n.language, isMounted],
  );

  const accountsQuery = trpc.accounts.list.useQuery(undefined, {
    enabled: dialogOpen,
  });

  const schema = React.useMemo(
    () => transferSchema(isMounted ? t : fallbackT),
    [fallbackT, isMounted, t],
  );

  const defaultValues = React.useMemo<TransferFormValues>(
    () => ({
      date: transfer?.date ? new Date(transfer.date) : new Date(),
      fromAccountId: transfer?.fromAccountId ?? "",
      toAccountId: transfer?.toAccountId ?? "",
      amount:
        transfer && typeof transfer.amount === "number"
          ? transfer.amount
          : Number.NaN,
      description: transfer?.description ?? "",
    }),
    [transfer],
  );

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(schema) as Resolver<TransferFormValues>,
    defaultValues,
  });

  React.useEffect(() => {
    if (dialogOpen) {
      form.reset(defaultValues);
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
    }
  };

  const createMutation = trpc.transactions.createTransfer.useMutation({
    onSuccess: async () => {
      toast.success(translate("form.toast.createSuccess"));
      handleOpenChange(false);
      await onSuccess?.();
    },
    onError: (err) => {
      toast.error(err.message ?? translate("form.toast.createError"));
    },
  });

  const updateMutation = trpc.transactions.updateTransfer.useMutation({
    onSuccess: async () => {
      toast.success(translate("form.toast.updateSuccess"));
      handleOpenChange(false);
      await onSuccess?.();
    },
    onError: (err) => {
      toast.error(err.message ?? translate("form.toast.updateError"));
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      date: values.date,
      fromAccountId: values.fromAccountId,
      toAccountId: values.toAccountId,
      amount: values.amount,
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
      {translate("header.new")}
    </Button>
  );

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{renderTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? translate("form.title.edit")
              : translate("form.title.create")}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? translate("form.description.edit")
              : translate("form.description.create")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{translate("form.labels.date")}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start gap-2",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        <IconCalendar className="size-4" />
                        {field.value
                          ? format(field.value, "PPP", { locale })
                          : translate("form.placeholders.date")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="p-0">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => field.onChange(date ?? new Date())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="fromAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {translate("form.labels.fromAccount")}
                    </FormLabel>
                    <Select
                      disabled={accountsQuery.isLoading}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={translate("form.placeholders.account")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
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
                name="toAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{translate("form.labels.toAccount")}</FormLabel>
                    <Select
                      disabled={accountsQuery.isLoading}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={translate("form.placeholders.account")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
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
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{translate("form.labels.amount")}</FormLabel>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      value={Number.isNaN(field.value) ? "" : field.value}
                      onChange={(event) =>
                        field.onChange(
                          event.target.value === ""
                            ? Number.NaN
                            : Number(event.target.value),
                        )
                      }
                    />
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
                      {translate("form.labels.description")}
                    </FormLabel>
                    <Input
                      placeholder={translate("form.placeholders.description")}
                      {...field}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
              >
                {translate("form.actions.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting && (
                  <IconLoader2 className="size-4 animate-spin" />
                )}
                {isEditing
                  ? translate("form.actions.save")
                  : translate("form.actions.create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
