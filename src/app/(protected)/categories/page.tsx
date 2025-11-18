"use client";

import { Tab, Tabs } from "@heroui/tabs";
import { IconPlus } from "@tabler/icons-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { GlowCard } from "@/components/gloweffect";
import { Button } from "@/components/ui/button";
import type { CategoryNode } from "@/hooks/categories/useCategoryTree";
import { useCategoryTree } from "@/hooks/categories/useCategoryTree";
import { trpc } from "@/lib/trpc/client";
import { CategoryDialog } from "./_components/CategoryDialog";
import { CategoryTreeTable } from "./_components/CategoryTreeTable";
import { ImportDefaultsDialog } from "./_components/ImportDefaultsDialog";

export default function CategoriesPage() {
  const { t, i18n } = useTranslation("categories");
  const [isMounted, setIsMounted] = React.useState(false);

  const [selectedType, setSelectedType] = React.useState<
    "expense" | "income" | "all"
  >("all");
  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = React.useState(false);
  const [selectedCategory, setSelectedCategory] =
    React.useState<CategoryNode | null>(null);
  const [parentId, setParentId] = React.useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = React.useState(false);
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const fallbackLng =
    (Array.isArray(i18n.options?.fallbackLng) && i18n.options.fallbackLng[0]) ||
    (typeof i18n.options?.fallbackLng === "string"
      ? i18n.options.fallbackLng
      : "en");

  const fallbackT = React.useMemo(
    () => i18n.getFixedT(fallbackLng, "categories"),
    [i18n, fallbackLng],
  );

  const translate = isMounted ? t : fallbackT;

  const {
    data: categories,
    isLoading: isCategoriesLoading,
    isError: isCategoriesError,
  } = trpc.categories.list.useQuery({
    type: selectedType === "all" ? undefined : selectedType,
    includeInactive,
  });

  const { categoryTree, expandedCategories, toggleCategory } = useCategoryTree({
    categories: categories ?? [],
    selectedType,
    includeInactive,
  });

  const utils = trpc.useUtils();

  const deleteMutation = trpc.categories.delete.useMutation({
    onSuccess: async () => {
      await utils.categories.list.invalidate();
      toast.success(translate("toasts.deleteSuccess"));
      setProcessingId(null);
    },
    onError: () => {
      toast.error(translate("toasts.deleteError"));
      setProcessingId(null);
    },
  });

  const handleCreate = () => {
    setSelectedCategory(null);
    setParentId(null);
    setCategoryDialogOpen(true);
  };

  const handleEdit = (category: CategoryNode) => {
    setSelectedCategory(category);
    setParentId(null);
    setCategoryDialogOpen(true);
  };

  const handleDelete = (category: CategoryNode) => {
    setProcessingId(category.id);
    deleteMutation.mutate({ id: category.id });
  };

  const handleRestore = (category: CategoryNode) => {
    setProcessingId(category.id);
    // Use delete mutation to toggle (it toggles is_active, so inactive becomes active)
    deleteMutation.mutate({ id: category.id });
  };

  const handleDialogSuccess = () => {
    setCategoryDialogOpen(false);
    setSelectedCategory(null);
    setParentId(null);
  };

  const isEmptyState =
    !categoryTree.length && !isCategoriesLoading && !isCategoriesError;

  return (
    <div className="space-y-4">
      <section className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            {translate("header.title")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {translate("header.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setImportDialogOpen(true)}>
            {translate("header.importButtonTitle")}
          </Button>
          <Button onClick={handleCreate}>
            <IconPlus stroke={1.5} className="size-4" />
            {translate("actions.create")}
          </Button>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Tabs
            aria-label="Category type"
            selectedKey={selectedType}
            onSelectionChange={(key) =>
              setSelectedType(key as "expense" | "income" | "all")
            }
          >
            <Tab key="all" title={translate("tabs.all")} />
            <Tab key="expense" title={translate("tabs.expenses")} />
            <Tab key="income" title={translate("tabs.incomes")} />
          </Tabs>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="includeInactive"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <label
              htmlFor="includeInactive"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              {translate("status.inactive")}
            </label>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-7">
        <GlowCard
          className="lg:col-span-7"
          title={translate("header.title")}
          description={translate("header.subtitle")}
          contentClassName="gap-6"
        >
          {isCategoriesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`categories-skeleton-${index}`}
                  className="h-24 animate-pulse rounded-lg bg-muted/60"
                />
              ))}
            </div>
          ) : isCategoriesError ? (
            <div className="py-12 text-center text-muted-foreground">
              {translate("table.error")}
            </div>
          ) : isEmptyState ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                {translate("table.empty")}
              </p>
              <Button onClick={() => setImportDialogOpen(true)}>
                {translate("header.importButtonTitle")}
              </Button>
            </div>
          ) : (
            <CategoryTreeTable
              categories={categoryTree}
              headers={{
                category: translate("table.headers.category"),
                type: translate("table.headers.type"),
                status: translate("table.headers.status"),
              }}
              emptyMessage={translate("table.empty")}
              expandedCategories={expandedCategories}
              onToggleCategory={toggleCategory}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRestore={handleRestore}
              processingId={processingId}
            />
          )}
        </GlowCard>
      </section>

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={selectedCategory}
        parentId={parentId}
        onSuccess={handleDialogSuccess}
      />

      <ImportDefaultsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
