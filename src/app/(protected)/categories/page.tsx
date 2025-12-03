"use client";

import { GlowCard } from "@/components/gloweffect";
import { Button } from "@/components/ui/button";
import type { CategoryNode } from "@/hooks/categories/useCategoryTree";
import { useCategoryTree } from "@/hooks/categories/useCategoryTree";
import { trpc } from "@/lib/trpc/client";
import { Tab, Tabs } from "@heroui/tabs";
import * as React from "react";
import { toast } from "sonner";
import { CategoryDialog } from "./_components/CategoryDialog";
import { CategoryTreeTable } from "./_components/CategoryTreeTable";

export default function CategoriesPage() {
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
      toast.success("Categoria excluída com sucesso.");
      setProcessingId(null);
    },
    onError: () => {
      toast.error("Não foi possível excluir a categoria.");
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
          <h2 className="text-2xl font-semibold tracking-tight">Categorias</h2>
          <p className="text-muted-foreground text-sm">
            Gerencie suas categorias de despesas e receitas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CategoryDialog
            open={categoryDialogOpen}
            onOpenChange={setCategoryDialogOpen}
            category={selectedCategory}
            onSuccess={handleDialogSuccess}
          />
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
            <Tab key="all" title="Todas" />
            <Tab key="expense" title="Despesas" />
            <Tab key="income" title="Receitas" />
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
              Inativa
            </label>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-7">
        <GlowCard
          className="lg:col-span-7"
          title="Categorias"
          description="Gerencie suas categorias de despesas e receitas."
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
              Não foi possível carregar as categorias no momento.
            </div>
          ) : isEmptyState ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Nenhuma categoria encontrada. Importe categorias padrão para
                começar.
              </p>
              <Button onClick={() => setImportDialogOpen(true)}>
                Importar padrões
              </Button>
            </div>
          ) : (
            <CategoryTreeTable
              categories={categoryTree}
              headers={{
                category: "Categoria",
                type: "Tipo",
                status: "Status",
              }}
              emptyMessage="Nenhuma categoria encontrada. Importe categorias padrão para começar."
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

      {/* <ImportDefaultsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={handleDialogSuccess}
      /> */}
    </div>
  );
}
