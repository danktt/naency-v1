"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

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
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import type { CategoryNode } from "@/hooks/categories/useCategoryTree";

type CategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CategoryNode | null;
  parentId?: string | null;
  onSuccess?: () => void;
};

const createCategorySchema = () =>
  z.object({
    name: z.string().min(1, "Name is required"),
    type: z.enum(["expense", "income"]),
    color: z.string().min(1, "Color is required").default("#cccccc"),
    icon: z.string().default(""),
    parent_id: z.string().uuid().nullable().optional(),
  });

export function CategoryDialog({
  open,
  onOpenChange,
  category,
  parentId,
  onSuccess,
}: CategoryDialogProps) {
  const { t, i18n } = useTranslation("categories");
  const utils = trpc.useUtils();
  const isMounted = React.useState(false)[0];
  const [isMountedState, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const fallbackT = React.useCallback(
    (key: string) => {
      const fallbackLng =
        (Array.isArray(i18n.options?.fallbackLng) &&
          i18n.options.fallbackLng[0]) ||
        (typeof i18n.options?.fallbackLng === "string"
          ? i18n.options.fallbackLng
          : "en");
      return i18n.getFixedT(fallbackLng, "categories")(key);
    },
    [i18n],
  );

  const translate = isMountedState ? t : fallbackT;

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
      toast.success(translate("toasts.createSuccess"));
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(translate("toasts.createError"));
      console.error(error);
    },
  });

  const updateMutation = trpc.categories.update.useMutation({
    onSuccess: async () => {
      await utils.categories.list.invalidate();
      toast.success(translate("toasts.updateSuccess"));
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(translate("toasts.updateError"));
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
  const dialogTitle = isEdit
    ? translate("dialog.edit.title")
    : translate("dialog.create.title");
  const dialogDescription = isEdit
    ? translate("dialog.edit.description")
    : translate("dialog.create.description");
  const submitLabel = isEdit
    ? translate("dialog.actions.update")
    : translate("dialog.actions.create");

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
                  <FormLabel>{translate("dialog.fields.name")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={translate("dialog.fields.namePlaceholder")}
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
                  <FormLabel>{translate("dialog.fields.type")}</FormLabel>
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
                      <SelectItem value="expense">
                        {translate("tabs.expenses")}
                      </SelectItem>
                      <SelectItem value="income">
                        {translate("tabs.incomes")}
                      </SelectItem>
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
                    <FormLabel>{translate("dialog.fields.color")}</FormLabel>
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
                    <FormLabel>{translate("dialog.fields.icon")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={translate("dialog.fields.iconPlaceholder")}
                        {...field}
                      />
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
                  <FormLabel>{translate("dialog.fields.parent")}</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value === "none" ? null : value)
                    }
                    value={field.value ?? "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={translate("dialog.fields.parentPlaceholder")}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">
                        {translate("dialog.fields.none")}
                      </SelectItem>
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
                {translate("dialog.actions.cancel")}
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
