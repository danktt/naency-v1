"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import type { inferRouterOutputs } from "@trpc/server";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/helpers/formatCurrency";
import { formatDate } from "@/helpers/formatDate";
import { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/server/api/root";

type RouterOutput = inferRouterOutputs<AppRouter>;
type BankAccount = RouterOutput["bankAccounts"]["list"][number];

const accountSchema = z.object({
  name: z.string().trim().min(1, "Please provide an account name."),
  type: z.enum(["checking", "credit", "investment"]),
  initialBalance: z.coerce
    .number({
      invalid_type_error: "Enter a valid amount.",
    })
    .min(0, "Initial balance cannot be negative."),
  currency: z.enum(["BRL", "USD"]),
  color: z.string().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, "Pick a valid color."),
});

type AccountFormValues = z.infer<typeof accountSchema>;

const accountTypeLabels: Record<AccountFormValues["type"], string> = {
  checking: "Checking",
  credit: "Credit",
  investment: "Investment",
};

const defaultFormValues: AccountFormValues = {
  name: "",
  type: "checking",
  initialBalance: 0,
  currency: "BRL",
  color: "#6366F1",
};

type AccountFormDialogProps = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AccountFormValues) => Promise<void> | void;
  isLoading: boolean;
  initialValues: AccountFormValues;
};

function AccountFormDialog({
  mode,
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  initialValues,
}: AccountFormDialogProps) {
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: initialValues,
  });

  const title = mode === "create" ? "New Account" : "Edit Account";
  const description =
    mode === "create"
      ? "Create a new bank account for this financial group."
      : "Update the bank account information.";
  const submitLabel = mode === "create" ? "Create Account" : "Save Changes";

  useEffect(() => {
    if (open) {
      form.reset(initialValues);
    }
  }, [
    open,
    form,
    initialValues.name,
    initialValues.type,
    initialValues.initialBalance,
    initialValues.currency,
    initialValues.color,
  ]);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      form.reset(initialValues);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit(values);
            })}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="My main account"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pick a type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="checking">Checking</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                        <SelectItem value="investment">Investment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pick a currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BRL">BRL</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="initialBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial balance</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={Number.isNaN(field.value) ? "" : field.value}
                        onChange={(event) => {
                          const value = event.target.value;
                          field.onChange(
                            value === ""
                              ? Number.NaN
                              : Number.parseFloat(value),
                          );
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <Input
                          type="color"
                          className="h-10 w-16 cursor-pointer p-1"
                          value={field.value}
                          onChange={field.onChange}
                        />
                        <Input
                          placeholder="#6366F1"
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isLoading}>
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const parseInitialBalance = (value: string | number | null | undefined) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

export default function BankAccountsPage() {
  const utils = trpc.useUtils();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(
    null,
  );
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(
    null,
  );

  const bankAccountsQuery = trpc.bankAccounts.list.useQuery();
  const accounts = bankAccountsQuery.data ?? [];

  const createMutation = trpc.bankAccounts.create.useMutation({
    onSuccess: async () => {
      toast.success("Account created successfully.");
      setIsCreateOpen(false);
      await utils.bankAccounts.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message ?? "Unable to create the account.");
    },
  });

  const updateMutation = trpc.bankAccounts.update.useMutation({
    onSuccess: async () => {
      toast.success("Account updated.");
      setIsEditOpen(false);
      setEditingAccount(null);
      await utils.bankAccounts.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message ?? "Unable to update the account.");
    },
  });

  const deleteMutation = trpc.bankAccounts.delete.useMutation({
    onSuccess: async () => {
      toast.success("Account deleted.");
      setIsDeleteOpen(false);
      setAccountToDelete(null);
      await utils.bankAccounts.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message ?? "Unable to delete the account.");
    },
  });

  const totalsByCurrency = useMemo(() => {
    if (!accounts.length) return [];
    const accumulator = new Map<AccountFormValues["currency"], number>();
    accounts.forEach((account) => {
      const currency = account.currency as AccountFormValues["currency"];
      const current = accumulator.get(currency) ?? 0;
      const numericBalance = parseInitialBalance(account.initial_balance);
      accumulator.set(currency, current + numericBalance);
    });
    return Array.from(accumulator.entries());
  }, [accounts]);

  const isLoading = bankAccountsQuery.isLoading;

  const handleOpenCreate = () => {
    setIsCreateOpen(true);
  };

  const handleEditAccount = (account: BankAccount) => {
    setEditingAccount(account);
    setIsEditOpen(true);
  };

  const handleDeleteRequest = (account: BankAccount) => {
    setAccountToDelete(account);
    setIsDeleteOpen(true);
  };

  const handleDeleteAccount = () => {
    if (!accountToDelete || deleteMutation.isPending) return;
    deleteMutation.mutate({ id: accountToDelete.id });
  };

  const editInitialValues: AccountFormValues = useMemo(
    () =>
      editingAccount
        ? {
            name: editingAccount.name,
            type: editingAccount.type as AccountFormValues["type"],
            initialBalance: parseInitialBalance(editingAccount.initial_balance),
            currency: editingAccount.currency as AccountFormValues["currency"],
            color: editingAccount.color ?? defaultFormValues.color,
          }
        : defaultFormValues,
    [editingAccount],
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">
            Bank Accounts
          </h2>
          <p className="text-muted-foreground text-sm">
            Manage the bank accounts connected to your financial group.
          </p>
        </div>
        <Button className="gap-2" onClick={handleOpenCreate}>
          <IconPlus className="size-4" />
          New Account
        </Button>
      </header>

      {totalsByCurrency.length ? (
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {totalsByCurrency.map(([currency, total]) => (
            <Card key={currency}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total ({currency})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {formatCurrency(total, currency)}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      <section className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Color</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Initial Balance</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="w-[140px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 w-4 rounded-full" />
                  </TableCell>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No bank accounts yet. Create your first account to get
                    started.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <span
                      className="inline-flex size-4 rounded-full border border-border shadow-sm"
                      style={{ backgroundColor: account.color }}
                      aria-hidden="true"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>
                    {accountTypeLabels[
                      account.type as AccountFormValues["type"]
                    ] ?? account.type}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(
                      parseInitialBalance(account.initial_balance),
                      account.currency as AccountFormValues["currency"],
                    )}
                  </TableCell>
                  <TableCell>{account.currency}</TableCell>
                  <TableCell>{formatDate(account.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => handleEditAccount(account)}
                      >
                        <IconPencil className="size-4" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteRequest(account)}
                      >
                        <IconTrash className="size-4" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      <AccountFormDialog
        mode="create"
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={async (values) => {
          try {
            await createMutation.mutateAsync(values);
          } catch {
            // handled by onError
          }
        }}
        isLoading={createMutation.isPending}
        initialValues={defaultFormValues}
      />

      <AccountFormDialog
        mode="edit"
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setEditingAccount(null);
          }
        }}
        onSubmit={async (values) => {
          if (!editingAccount) return;
          try {
            await updateMutation.mutateAsync({
              id: editingAccount.id,
              ...values,
            });
          } catch {
            // handled by onError
          }
        }}
        isLoading={updateMutation.isPending}
        initialValues={editInitialValues}
      />

      <AlertDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) {
            setAccountToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Do you really want to delete the
              account{" "}
              <span className="font-medium">
                {accountToDelete?.name ?? "this account"}
              </span>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button
                variant="outline"
                disabled={deleteMutation.isPending}
                onClick={() => setIsDeleteOpen(false)}
              >
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                isLoading={deleteMutation.isPending}
              >
                Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
