"use client";

import { DynamicIcon } from "@/components/DynamicIcon";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import type { CategoryNode } from "@/hooks/categories/useCategoryTree";
import { useCategoryTree } from "@/hooks/categories/useCategoryTree";
import { trpc } from "@/lib/trpc/client";
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconPlus,
} from "@tabler/icons-react";
import { parseAsStringEnum, useQueryState } from "nuqs";
import * as React from "react";
import { toast } from "sonner";
import { CategoryDialog } from "./_components/CategoryDialog";
import { CategoryTreeTable } from "./_components/CategoryTreeTable";
import { CreateCategoryDialog } from "./_components/CreateCategoryDialog";
export default function CategoriesPage() {
  const [selectedTab, setSelectedTab] = useQueryState(
    "tab",
    parseAsStringEnum(["income", "expense"]).withDefault("income"),
  );

  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [createCategoryDialogOpen, setCreateCategoryDialogOpen] =
    React.useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = React.useState(false);
  const [selectedCategory, setSelectedCategory] =
    React.useState<CategoryNode | null>(null);
  const [parentCategory, setParentCategory] =
    React.useState<CategoryNode | null>(null);
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  const {
    data: categories,
    isLoading: isCategoriesLoading,
    isError: isCategoriesError,
  } = trpc.categories.list.useQuery({
    type: selectedTab ?? "income",
    includeInactive,
  });

  const { categoryTree, expandedCategories, toggleCategory } = useCategoryTree({
    categories: categories ?? [],
    selectedType: selectedTab ?? "income",
    includeInactive,
  });

  const utils = trpc.useUtils();

  // Limpar processingId quando os dados mudarem (após arquivar/desarquivar)
  React.useEffect(() => {
    if (processingId && categories && !isCategoriesLoading) {
      // Aguardar um pouco para garantir que a query foi atualizada
      const timer = setTimeout(() => {
        setProcessingId(null);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [categories, processingId, isCategoriesLoading]);

  const deleteMutation = trpc.categories.delete.useMutation({
    onSuccess: async () => {
      await utils.categories.list.invalidate();
    },
    onError: () => {
      toast.error("Não foi possível arquivar a categoria.");
      setProcessingId(null);
    },
  });

  const findParentCategory = (
    categoryId: string,
    nodes: CategoryNode[],
  ): CategoryNode | null => {
    for (const node of nodes) {
      if (node.children.some((child) => child.id === categoryId)) {
        return node;
      }
      const found = findParentCategory(categoryId, node.children);
      if (found) return found;
    }
    return null;
  };

  const handleEdit = (category: CategoryNode) => {
    setSelectedCategory(category);
    // Se for subcategoria, encontrar a categoria pai
    if (category.parent_id) {
      const parent = findParentCategory(category.id, categoryTree);
      setParentCategory(parent);
    } else {
      setParentCategory(null);
    }
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

  const getAllChildIds = (node: CategoryNode): string[] => {
    const ids: string[] = [];
    node.children.forEach((child) => {
      ids.push(child.id);
      ids.push(...getAllChildIds(child));
    });
    return ids;
  };

  const handleDelete = (category: CategoryNode) => {
    setProcessingId(category.id);

    // Se a categoria tem filhos, arquivar todos os filhos também
    if (category.children.length > 0) {
      const childIds = getAllChildIds(category);
      const allIds = [category.id, ...childIds];
      let completed = 0;
      let hasError = false;

      // Arquivar todas as categorias (pai + filhos)
      allIds.forEach((id) => {
        deleteMutation.mutate(
          { id },
          {
            onSuccess: async () => {
              completed++;
              if (completed === allIds.length) {
                await utils.categories.list.invalidate();
                if (!hasError) {
                  toast.success(
                    "Categoria e subcategorias arquivadas com sucesso.",
                  );
                }
                setProcessingId(null);
              }
            },
            onError: () => {
              hasError = true;
              completed++;
              if (completed === allIds.length) {
                toast.error("Erro ao arquivar algumas categorias.");
                setProcessingId(null);
              }
            },
          },
        );
      });
    } else {
      // Se não tem filhos, arquivar apenas a categoria
      deleteMutation.mutate(
        { id: category.id },
        {
          onSuccess: async () => {
            await utils.categories.list.invalidate();
            toast.success("Categoria arquivada com sucesso.");
            setProcessingId(null);
          },
          onError: () => {
            toast.error("Não foi possível arquivar a categoria.");
            setProcessingId(null);
          },
        },
      );
    }
  };

  const handleRestore = (category: CategoryNode) => {
    setProcessingId(category.id);

    // Se a categoria tem filhos, desarquivar todos os filhos também
    if (category.children.length > 0) {
      const childIds = getAllChildIds(category);
      const allIds = [category.id, ...childIds];
      let completed = 0;
      let hasError = false;

      // Desarquivar todas as categorias (pai + filhos)
      allIds.forEach((id) => {
        deleteMutation.mutate(
          { id },
          {
            onSuccess: async () => {
              completed++;
              if (completed === allIds.length) {
                await utils.categories.list.invalidate();
                if (!hasError) {
                  toast.success(
                    "Categoria e subcategorias desarquivadas com sucesso.",
                  );
                }
                setProcessingId(null);
              }
            },
            onError: () => {
              hasError = true;
              completed++;
              if (completed === allIds.length) {
                toast.error("Erro ao desarquivar algumas categorias.");
                setProcessingId(null);
              }
            },
          },
        );
      });
    } else {
      // Se não tem filhos, desarquivar apenas a categoria
      deleteMutation.mutate(
        { id: category.id },
        {
          onSuccess: async () => {
            await utils.categories.list.invalidate();
            toast.success("Categoria desarquivada com sucesso.");
            setProcessingId(null);
          },
          onError: () => {
            toast.error("Não foi possível desarquivar a categoria.");
            setProcessingId(null);
          },
        },
      );
    }
  };

  const handleCreateSubcategory = (category: CategoryNode) => {
    setSelectedCategory(null);
    setParentCategory(category);
    setCategoryDialogOpen(true);
  };

  const handleDuplicate = (_category: CategoryNode) => {
    // TODO: Implement category duplication
    toast.info("Funcionalidade de duplicar categoria em desenvolvimento.");
  };

  const handleMove = (_category: CategoryNode) => {
    // TODO: Implement category move functionality
    toast.info("Funcionalidade de mover categoria em desenvolvimento.");
  };

  const handleDialogSuccess = () => {
    setCategoryDialogOpen(false);
    setSelectedCategory(null);
    setParentCategory(null);
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
          <Button onClick={() => setCreateCategoryDialogOpen(true)}>
            <IconPlus stroke={1.5} className="size-4" />
            Nova categoria
          </Button>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Tabs
            value={selectedTab ?? "income"}
            onValueChange={(value) => {
              if (value === "income" || value === "expense") {
                setSelectedTab(value);
              }
            }}
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
              aria-label="Mostrar categorias inativas"
              size="sm"
              variant="outline"
              pressed={includeInactive}
              onPressedChange={setIncludeInactive}
              className="data-[state=on]:bg-transparent data-[state=on]:*:[svg]:fill-primary data-[state=on]:*:[svg]:stroke-primary"
            >
              <DynamicIcon icon="archive" />
              Arquivadas
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
            onCreateSubcategory={handleCreateSubcategory}
            onDuplicate={handleDuplicate}
            onMove={handleMove}
            processingId={processingId}
          />
        )}
      </section>

      <CreateCategoryDialog
        open={createCategoryDialogOpen}
        onOpenChange={setCreateCategoryDialogOpen}
        onSuccess={() => setCreateCategoryDialogOpen(false)}
      />

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={(open) => {
          setCategoryDialogOpen(open);
          if (!open) {
            setSelectedCategory(null);
            setParentCategory(null);
          }
        }}
        category={selectedCategory}
        parentCategory={parentCategory}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
