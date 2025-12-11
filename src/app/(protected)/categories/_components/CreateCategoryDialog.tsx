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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconArrowDownLeft, IconArrowUpRight } from "@tabler/icons-react";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { IconSelector } from "./IconSelector";

type CreateCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

const createCategorySchema = z.object({
  name: z.string().min(1, "O nome é obrigatório"),
  type: z.enum(["expense", "income"]),
  icon: z.string().min(1, "O ícone é obrigatório"),
});

export function CreateCategoryDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateCategoryDialogProps) {
  const utils = trpc.useUtils();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  console.log(tab);
  const { data: allCategories } = trpc.categories.list.useQuery(
    {
      includeInactive: false,
    },
    {
      enabled: open,
    },
  );

  // Extrair ícones já em uso por outras categorias pai
  const usedIcons = React.useMemo(() => {
    if (!allCategories) return [];
    return allCategories
      .filter((cat) => cat.parent_id === null && cat.icon)
      .map((cat) => cat.icon as string);
  }, [allCategories]);

  const form = useForm<z.infer<typeof createCategorySchema>>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: "",
      type: tab ? "expense" : "income",
      icon: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        name: "",
        type: tab ? "expense" : "income",
        icon: "",
      });
    }
  }, [open, form]);

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

  const onSubmit = (values: z.infer<typeof createCategorySchema>) => {
    if (allCategories) {
      const existingCategory = allCategories.find(
        (cat) =>
          cat.name.toLowerCase().trim() === values.name.toLowerCase().trim() &&
          cat.type === values.type &&
          cat.parent_id === null,
      );

      if (existingCategory) {
        form.setError("name", {
          type: "manual",
          message: "Já existe uma categoria com este nome e tipo.",
        });
        return;
      }
    }

    createMutation.mutate({
      ...values,
      parent_id: null,
    });
  };

  const isSubmitting = createMutation.isPending;

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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar categoria</DialogTitle>
          <DialogDescription>
            Adicione uma nova categoria para organizar suas transações.
          </DialogDescription>
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
                      <Tabs value={field.value} onValueChange={field.onChange}>
                        <TabsList className="w-full">
                          {typeTabs.map((tab) => {
                            const IconComponent = tab.icon;
                            return (
                              <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                className="flex-1"
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
              <div className="flex gap-4 col-span-2 items-start">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="flex-1">
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
                          hasError={Boolean(form.formState.errors.icon)}
                          usedIcons={usedIcons}
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
                Criar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
