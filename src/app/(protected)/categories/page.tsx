"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import type { CategoryNode } from "@/hooks/categories/useCategoryTree";
import { useCategoryTree } from "@/hooks/categories/useCategoryTree";
import { trpc } from "@/lib/trpc/client";
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconLabelOff,
  IconPlus,
} from "@tabler/icons-react";
import * as React from "react";
import { toast } from "sonner";
import { CategoryDialog } from "./_components/CategoryDialog";
import { CategoryTreeTable } from "./_components/CategoryTreeTable";

export default function CategoriesPage() {
  const [selectedType, setSelectedType] = React.useState<"expense" | "income">(
    "income",
  );
  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = React.useState(false);
  const [selectedCategory, setSelectedCategory] =
    React.useState<CategoryNode | null>(null);
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  const {
    data: categories,
    isLoading: isCategoriesLoading,
    isError: isCategoriesError,
  } = trpc.categories.list.useQuery({
    type: selectedType,
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

  const handleEdit = (category: CategoryNode) => {
    setSelectedCategory(category);
    setCategoryDialogOpen(true);
  };

  const typeTabs = [
    {
      id: "income",
      label: "Receitas",
      icon: IconArrowDownLeft,
    },
    {
      id: "expense",
      label: "Despesas",
      icon: IconArrowUpRight,
    },
  ] as const;

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
          <Button onClick={() => setCategoryDialogOpen(true)}>
            <IconPlus stroke={1.5} className="size-4" />
            Nova categoria
          </Button>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Tabs
            value={selectedType}
            onValueChange={(value) =>
              setSelectedType(value as "expense" | "income")
            }
          >
            <TabsList>
              {typeTabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <TabsTrigger key={tab.id} value={tab.id} className="flex-1">
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

          <div className="flex items-center gap-2">
            <Toggle
              aria-label="Toggle bookmark"
              size="sm"
              variant="outline"
              className="data-[state=on]:bg-transparent data-[state=on]:*:[svg]:fill-primary data-[state=on]:*:[svg]:stroke-primary"
            >
              <IconLabelOff />
              Inativas
            </Toggle>
          </div>
        </div>
      </section>

      <section>
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
            <Button disabled>Importar padrões</Button>
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
      </section>

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={selectedCategory}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
