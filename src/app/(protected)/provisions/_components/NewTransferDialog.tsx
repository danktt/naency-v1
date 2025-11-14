"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";

const schema = z.object({
  fromAccountId: z.string().uuid({ message: "Selecione a conta de origem." }),
  toAccountId: z.string().uuid({ message: "Selecione a conta de destino." }),
  amount: z.coerce.number().positive("Informe um valor válido."),
  note: z.string().optional(),
  month: z.coerce.number().min(0).max(11),
  year: z.coerce.number().min(2000).max(2100),
});

type FormData = z.infer<typeof schema>;

export function NewTransferDialog({
  accounts,
}: {
  accounts: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);

  const { mutateAsync: createTransfer, isPending } =
    trpc.provisions.createTransfer.useMutation({
      onMutate: (data) => {
        toast.loading("Criando transferência...");
      },
      onSuccess: () => {
        toast.success("Transferência criada com sucesso ✅");
        setOpen(false);
      },
      onError: (err) => {
        toast.error("Erro ao criar transferência", {
          description: err.message,
        });
      },
    });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      month: new Date().getMonth(),
      year: new Date().getFullYear(),
    },
  });

  const onSubmit = async (data: FormData) => {
    await createTransfer(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <ArrowLeftRight className="h-4 w-4" />
          Nova Transferência
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova transferência planejada</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-sm font-medium">Conta de origem</Label>
              <Select
                onValueChange={(v) => form.setValue("fromAccountId", v)}
                defaultValue={form.watch("fromAccountId")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.fromAccountId && (
                <p className="text-xs text-red-500 mt-1">
                  {form.formState.errors.fromAccountId.message}
                </p>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">Conta de destino</Label>
              <Select
                onValueChange={(v) => form.setValue("toAccountId", v)}
                defaultValue={form.watch("toAccountId")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.toAccountId && (
                <p className="text-xs text-red-500 mt-1">
                  {form.formState.errors.toAccountId.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-sm font-medium">Mês</Label>
              <Input
                type="number"
                min={0}
                max={11}
                {...form.register("month")}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Ano</Label>
              <Input
                type="number"
                min={2000}
                max={2100}
                {...form.register("year")}
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Valor planejado</Label>
            <Input
              type="number"
              step="0.01"
              {...form.register("amount")}
              placeholder="Ex: 500.00"
            />
            {form.formState.errors.amount && (
              <p className="text-xs text-red-500 mt-1">
                {form.formState.errors.amount.message}
              </p>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium">Observação</Label>
            <Input {...form.register("note")} placeholder="Opcional" />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending} className="w-full gap-2">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar transferência
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
