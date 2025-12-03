"use client";

import { Button } from "@/components/ui/button";
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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CategoryNode } from "@/hooks/categories/useCategoryTree";
import { trpc } from "@/lib/trpc/client";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconPlus,
} from "@tabler/icons-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { IconSelector } from "./IconSelector";

type CategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CategoryNode | null;
  onSuccess?: () => void;
};

const createCategorySchema = () =>
  z.object({
    name: z.string().min(1, "O nome é obrigatório"),
    type: z.enum(["expense", "income"]),
    icon: z.string().min(1, "O ícone é obrigatório"),
  });

export function CategoryDialog({
  open,
  onOpenChange,
  category,
  onSuccess,
}: CategoryDialogProps) {
  const utils = trpc.useUtils();

  const { data: allCategories } = trpc.categories.list.useQuery(
    {
      includeInactive: false,
    },
    {
      enabled: open,
    },
  );

  const form = useForm<z.infer<ReturnType<typeof createCategorySchema>>>({
    resolver: zodResolver(createCategorySchema()),
    defaultValues: {
      name: category?.name ?? "",
      type: category?.type ?? "income",
      icon: category?.icon ?? "",
    },
  });

  React.useEffect(() => {
    if (open && category) {
      form.reset({
        name: category.name,
        type: category.type,
        icon: category.icon ?? "",
      });
    } else if (open && !category) {
      form.reset({
        name: "",
        type: "income",
        icon: "",
      });
    }
  }, [open, category, form]);

  const createMutation = trpc.categories.create.useMutation({
    onSuccess: async () => {
      // Invalida todas as queries de categorias para atualizar a página
      await utils.categories.list.invalidate();
      toast.success("Categoria criada com sucesso.");
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("Não foi possível criar a categoria.");
      console.error(error);
    },
  });

  const updateMutation = trpc.categories.update.useMutation({
    onSuccess: async () => {
      // Invalida todas as queries de categorias para atualizar a página
      await utils.categories.list.invalidate();
      toast.success("Categoria atualizada com sucesso.");
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("Não foi possível atualizar a categoria.");
      console.error(error);
    },
  });

  const onSubmit = (
    values: z.infer<ReturnType<typeof createCategorySchema>>,
  ) => {
    // Verificar se já existe uma categoria com o mesmo nome e tipo
    if (allCategories) {
      const existingCategory = allCategories.find(
        (cat) =>
          cat.name.toLowerCase().trim() === values.name.toLowerCase().trim() &&
          cat.type === values.type &&
          cat.parent_id === null && // Apenas categorias pai
          cat.id !== category?.id, // Ignorar a categoria atual se estiver editando
      );

      if (existingCategory) {
        form.setError("name", {
          type: "manual",
          message: "Já existe uma categoria com este nome e tipo.",
        });
        return;
      }
    }

    if (category) {
      updateMutation.mutate({
        id: category.id,
        ...values,
        parent_id: null, // Sempre null para categorias pai
      });
    } else {
      createMutation.mutate({
        ...values,
        parent_id: null, // Sempre null para categorias pai
      });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const isEdit = !!category;
  const dialogTitle = isEdit ? "Editar categoria" : "Criar categoria";
  const dialogDescription = isEdit
    ? "Atualize as informações da categoria."
    : "Adicione uma nova categoria para organizar suas transações.";
  const submitLabel = isEdit ? "Atualizar" : "Criar";

  const typeTabs = [
    {
      id: "income",
      label: "Receita",
      icon: IconArrowDownLeft,
    },
    {
      id: "expense",
      label: "Despesa",
      icon: IconArrowUpRight,
    },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <IconPlus stroke={1.5} className="size-4" />
          Nova categoria
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4 items-start">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormControl>
                      <Tabs
                        value={field.value}
                        onValueChange={field.onChange}
                        isEdit={isEdit}
                      >
                        <TabsList className="w-full">
                          {typeTabs.map((tab) => {
                            const IconComponent = tab.icon;
                            return (
                              <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                className="flex-1"
                                disabled={isEdit}
                              >
                                <IconComponent
                                  aria-hidden="true"
                                  className={`mr-1.5 h-4 w-4 opacity-60 ${tab.id === "income" ? "text-icon-income" : "text-icon-expense"}`}
                                />
                                {tab.label}
                              </TabsTrigger>
                            );
                          })}
                        </TabsList>
                      </Tabs>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className=" flex gap-4 col-span-2 items-start">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>
                        Nome
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Digite o nome da categoria"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Ícone
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <IconSelector
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <DialogFooter className="flex w-full flex-col-reverse gap-2 px-0 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
