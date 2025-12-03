"use client";

import { Button } from "@/components/ui/button";
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
import type { CategoryNode } from "@/hooks/categories/useCategoryTree";
import { trpc } from "@/lib/trpc/client";
import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type CategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CategoryNode | null;
  parentId?: string | null;
  onSuccess?: () => void;
};

const createCategorySchema = () =>
  z.object({
    name: z.string().min(1, "O nome é obrigatório"),
    type: z.enum(["expense", "income"]),
    color: z.string().min(1, "A cor é obrigatória"),
    icon: z.string(),
    parent_id: z.string().uuid().nullable().optional(),
  });

export function CategoryDialog({
  open,
  onOpenChange,
  category,
  parentId,
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
      type: category?.type ?? "expense",
      color: category?.color ?? "#cccccc",
      icon: category?.icon ?? "",
      parent_id: parentId ?? category?.parent_id ?? null,
    },
  });

  React.useEffect(() => {
    if (open && category) {
      form.reset({
        name: category.name,
        type: category.type,
        color: category.color ?? "#cccccc",
        icon: category.icon ?? "",
        parent_id: category.parent_id,
      });
    } else if (open && !category) {
      form.reset({
        name: "",
        type: "expense",
        color: "#cccccc",
        icon: "",
        parent_id: parentId ?? null,
      });
    }
  }, [open, category, parentId, form]);

  const createMutation = trpc.categories.create.useMutation({
    onSuccess: async () => {
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
    if (category) {
      updateMutation.mutate({
        id: category.id,
        ...values,
      });
    } else {
      createMutation.mutate(values);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const values = form.watch();

  // Build parent options, excluding current category and its descendants if editing
  const parentOptions = React.useMemo(() => {
    if (!allCategories) return [];
    const currentType = values.type || category?.type;
    const filtered = allCategories.filter((cat) => {
      // Exclude current category if editing
      if (category && cat.id === category.id) return false;
      // Exclude descendants of current category
      if (category) {
        const isDescendant = (catId: string): boolean => {
          const cat = allCategories.find((c) => c.id === catId);
          if (!cat) return false;
          if (cat.parent_id === category.id) return true;
          if (cat.parent_id) return isDescendant(cat.parent_id);
          return false;
        };
        if (isDescendant(cat.id)) return false;
      }
      // Filter by type if type is selected
      if (currentType && cat.type !== currentType) return false;
      // Only show active categories as parents
      if (!cat.is_active) return false;
      return true;
    });
    return filtered;
  }, [allCategories, category, values.type]);

  const isEdit = !!category;
  const dialogTitle = isEdit ? "Editar categoria" : "Criar categoria";
  const dialogDescription = isEdit
    ? "Atualize as informações da categoria."
    : "Adicione uma nova categoria para organizar suas transações.";
  const submitLabel = isEdit ? "Atualizar" : "Criar";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
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
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isEdit}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="expense">Despesas</SelectItem>
                      <SelectItem value="income">Receitas</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          {...field}
                          className="h-10 w-20 p-1 cursor-pointer"
                        />
                        <Input
                          placeholder="#cccccc"
                          {...field}
                          className="flex-1"
                        />
                      </div>
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
                    <FormLabel>Ícone</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome do ícone" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="parent_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria pai</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value === "none" ? null : value)
                    }
                    value={field.value ?? "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria pai (opcional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {parentOptions.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
