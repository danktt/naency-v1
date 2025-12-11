"use client";

import { IconSelector } from "@/app/(protected)/categories/_components/IconSelector";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconCornerDownRight } from "@tabler/icons-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Icon } from "../iconMap";

type CreateCategoryFromSelectDialogProps = {
  type: "income" | "expense";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (categoryId: string) => void;
};

type CreationMode = "existing" | "new";

const existingParentSchema = z.object({
  mode: z.literal("existing"),
  parentCategoryId: z.string().min(1, "Selecione uma categoria"),
  subcategoryName: z.string().min(1, "O nome da subcategoria é obrigatório"),
});

const newParentSchema = z.object({
  mode: z.literal("new"),
  parentName: z.string().min(1, "O nome da categoria é obrigatório"),
  parentIcon: z.string().min(1, "O ícone é obrigatório"),
  subcategoryName: z.string().min(1, "O nome da subcategoria é obrigatório"),
});

const formSchema = z.discriminatedUnion("mode", [
  existingParentSchema,
  newParentSchema,
]);

type FormValues = z.infer<typeof formSchema>;

export function CreateCategoryFromSelectDialog({
  type,
  open,
  onOpenChange,
  onSuccess,
}: CreateCategoryFromSelectDialogProps) {
  const utils = trpc.useUtils();

  // Buscar categorias pai existentes
  const { data: allCategories } = trpc.categories.list.useQuery(
    { type, includeInactive: false },
    { enabled: open },
  );

  // Filtrar apenas categorias pai (sem parent_id)
  const parentCategories = React.useMemo(() => {
    if (!allCategories) return [];
    return allCategories.filter((cat) => cat.parent_id === null);
  }, [allCategories]);

  // Ícones já em uso por categorias pai
  const usedIcons = React.useMemo(() => {
    if (!allCategories) return [];
    return allCategories
      .filter((cat) => cat.parent_id === null && cat.icon)
      .map((cat) => cat.icon as string);
  }, [allCategories]);

  const hasParentCategories = parentCategories.length > 0;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mode: hasParentCategories ? "existing" : "new",
      parentCategoryId: "",
      parentName: "",
      parentIcon: "",
      subcategoryName: "",
    } as FormValues,
  });

  const mode = form.watch("mode");

  // Reset form quando o dialog abre/fecha
  React.useEffect(() => {
    if (open) {
      form.reset({
        mode: hasParentCategories ? "existing" : "new",
        parentCategoryId: "",
        parentName: "",
        parentIcon: "",
        subcategoryName: "",
      } as FormValues);
    }
  }, [open, hasParentCategories, form]);

  const createMutation = trpc.categories.create.useMutation();

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    try {
      let parentId: string;

      if (values.mode === "existing") {
        parentId = values.parentCategoryId;

        // Verificar se já existe subcategoria com mesmo nome
        const existingSubcategory = allCategories?.find(
          (cat) =>
            cat.name.toLowerCase().trim() ===
              values.subcategoryName.toLowerCase().trim() &&
            cat.parent_id === parentId,
        );

        if (existingSubcategory) {
          form.setError("subcategoryName", {
            type: "manual",
            message: "Já existe uma subcategoria com este nome.",
          });
          setIsSubmitting(false);
          return;
        }
      } else {
        // Verificar se já existe categoria pai com mesmo nome
        const existingParent = allCategories?.find(
          (cat) =>
            cat.name.toLowerCase().trim() ===
              values.parentName.toLowerCase().trim() && cat.parent_id === null,
        );

        if (existingParent) {
          form.setError("parentName", {
            type: "manual",
            message: "Já existe uma categoria com este nome.",
          });
          setIsSubmitting(false);
          return;
        }

        // Criar categoria pai primeiro
        const newParent = await createMutation.mutateAsync({
          name: values.parentName,
          type,
          icon: values.parentIcon,
          parent_id: null,
        });

        if (!newParent?.id) {
          throw new Error("Falha ao criar categoria pai");
        }

        parentId = newParent.id;
      }

      // Criar subcategoria
      const newSubcategory = await createMutation.mutateAsync({
        name: values.subcategoryName,
        type,
        icon: undefined,
        parent_id: parentId,
      });

      if (!newSubcategory?.id) {
        throw new Error("Falha ao criar subcategoria");
      }

      await utils.categories.list.invalidate();
      toast.success("Categoria criada com sucesso.");
      onOpenChange(false);
      onSuccess(newSubcategory.id);
    } catch (error) {
      toast.error("Não foi possível criar a categoria.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModeChange = (newMode: CreationMode) => {
    form.setValue("mode", newMode, { shouldValidate: false });
    // Limpar campos específicos ao trocar de modo
    if (newMode === "existing") {
      form.setValue("parentName", "");
      form.setValue("parentIcon", "");
    } else {
      form.setValue("parentCategoryId", "");
    }
  };

  const typeLabel = type === "income" ? "receita" : "despesa";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova categoria</DialogTitle>
          <DialogDescription>
            Crie uma nova categoria de {typeLabel} para suas transações.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Seleção de modo */}
            {hasParentCategories && (
              <FormField
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={(value) =>
                          handleModeChange(value as CreationMode)
                        }
                        className="gap-4"
                      >
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="existing" id="existing" />
                          <Label
                            htmlFor="existing"
                            className="font-normal cursor-pointer"
                          >
                            Adicionar em categoria existente
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="new" id="new" />
                          <Label
                            htmlFor="new"
                            className="font-normal cursor-pointer"
                          >
                            Criar nova categoria
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Modo: Categoria existente */}
            {mode === "existing" && (
              <>
                <FormField
                  control={form.control}
                  name="parentCategoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Categoria
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {parentCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <div className="flex items-center gap-2">
                                {cat.icon && <Icon iconName={cat.icon} />}
                                <span>{cat.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-2">
                  <IconCornerDownRight className="size-8 text-primary shrink-0" />
                  <FormField
                    control={form.control}
                    name="subcategoryName"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>
                          Subcategoria
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Digite o nome da subcategoria"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* Modo: Nova categoria */}
            {mode === "new" && (
              <>
                <div className="flex gap-4 items-start">
                  <FormField
                    control={form.control}
                    name="parentName"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>
                          Nome da categoria
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
                    name="parentIcon"
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
                            hasError={Boolean(form.formState.errors.parentIcon)}
                            usedIcons={usedIcons}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <IconCornerDownRight className="size-8 text-primary shrink-0" />
                  <FormField
                    control={form.control}
                    name="subcategoryName"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>
                          Subcategoria
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Digite o nome da subcategoria"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            <DialogFooter className="flex w-full flex-col-reverse gap-2 px-0 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Criar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
