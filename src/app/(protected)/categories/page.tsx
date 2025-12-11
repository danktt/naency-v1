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
import { parseAsBoolean, parseAsStringEnum, useQueryState } from "nuqs";
import * as React from "react";
import { toast } from "sonner";
import { CategoryDialog } from "./_components/CategoryDialog";
import { CategoryTreeTable } from "./_components/CategoryTreeTable";
import { CreateCategoryDialog } from "./_components/CreateCategoryDialog";

// Constantes extraídas para fora do componente
const TYPE_TABS = [
  { id: "income", label: "Receitas", icon: IconArrowDownLeft },
  { id: "expense", label: "Despesas", icon: IconArrowUpRight },
] as const;

// Função auxiliar para coletar todos os IDs de filhos recursivamente
const collectChildIds = (node: CategoryNode): string[] =>
  node.children.flatMap((child) => [child.id, ...collectChildIds(child)]);

// Função auxiliar para encontrar categoria pai
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

export default function CategoriesPage() {
  // URL State
  const [selectedTab, setSelectedTab] = useQueryState(
    "tab",
    parseAsStringEnum(["income", "expense"]).withDefault("income"),
  );

  const [includeInactive, setIncludeInactive] = useQueryState(
    "archived",
    parseAsBoolean.withDefault(false),
  );

  // Local State
  const [createCategoryDialogOpen, setCreateCategoryDialogOpen] =
    React.useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = React.useState(false);
  const [selectedCategory, setSelectedCategory] =
    React.useState<CategoryNode | null>(null);
  const [parentCategory, setParentCategory] =
    React.useState<CategoryNode | null>(null);
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  // Queries
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

  // Mutations - usando mutateAsync para controle com Promise
  const { mutateAsync: toggleCategoryAsync } =
    trpc.categories.delete.useMutation();

  // Handler genérico para arquivar/desarquivar categorias
  const handleToggleStatus = React.useCallback(
    async (
      category: CategoryNode,
      action: "archive" | "restore",
    ): Promise<void> => {
      setProcessingId(category.id);

      const hasChildren = category.children.length > 0;
      const allIds = hasChildren
        ? [category.id, ...collectChildIds(category)]
        : [category.id];

      const messages = {
        archive: {
          success: hasChildren
            ? "Categoria e subcategorias arquivadas com sucesso."
            : "Categoria arquivada com sucesso.",
          error: hasChildren
            ? "Erro ao arquivar algumas categorias."
            : "Não foi possível arquivar a categoria.",
        },
        restore: {
          success: hasChildren
            ? "Categoria e subcategorias desarquivadas com sucesso."
            : "Categoria desarquivada com sucesso.",
          error: hasChildren
            ? "Erro ao desarquivar algumas categorias."
            : "Não foi possível desarquivar a categoria.",
        },
      };

      try {
        // Executa todas as mutações em paralelo
        await Promise.all(allIds.map((id) => toggleCategoryAsync({ id })));

        // Invalida a query e mostra sucesso
        await utils.categories.list.invalidate();
        toast.success(messages[action].success);
      } catch {
        toast.error(messages[action].error);
      } finally {
        setProcessingId(null);
      }
    },
    [toggleCategoryAsync, utils.categories.list],
  );

  // Handlers específicos que usam o handler genérico
  const handleDelete = React.useCallback(
    (category: CategoryNode) => handleToggleStatus(category, "archive"),
    [handleToggleStatus],
  );

  const handleRestore = React.useCallback(
    (category: CategoryNode) => handleToggleStatus(category, "restore"),
    [handleToggleStatus],
  );

  const handleEdit = React.useCallback(
    (category: CategoryNode) => {
      setSelectedCategory(category);
      setParentCategory(
        category.parent_id
          ? findParentCategory(category.id, categoryTree)
          : null,
      );
      setCategoryDialogOpen(true);
    },
    [categoryTree],
  );

  const handleCreateSubcategory = React.useCallback(
    (category: CategoryNode) => {
      setSelectedCategory(null);
      setParentCategory(category);
      setCategoryDialogOpen(true);
    },
    [],
  );

  const handleDialogSuccess = React.useCallback(() => {
    setCategoryDialogOpen(false);
    setSelectedCategory(null);
    setParentCategory(null);
  }, []);

  const handleDialogClose = React.useCallback((open: boolean) => {
    setCategoryDialogOpen(open);
    if (!open) {
      setSelectedCategory(null);
      setParentCategory(null);
    }
  }, []);

  // TODO handlers (podem ser removidos quando implementados)
  const handleDuplicate = React.useCallback((_category: CategoryNode) => {
    toast.info("Funcionalidade de duplicar categoria em desenvolvimento.");
  }, []);

  const handleMove = React.useCallback((_category: CategoryNode) => {
    toast.info("Funcionalidade de mover categoria em desenvolvimento.");
  }, []);

  // Computed values
  const isEmptyState =
    !categoryTree.length && !isCategoriesLoading && !isCategoriesError;

  return (
    <div className="space-y-4">
      {/* Header */}
      <section className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">Categorias</h2>
          <p className="text-muted-foreground text-sm">
            Gerencie suas categorias de despesas e receitas.
          </p>
        </div>
        <Button onClick={() => setCreateCategoryDialogOpen(true)}>
          <IconPlus stroke={1.5} className="size-4" />
          Nova categoria
        </Button>
      </section>

      {/* Filters */}
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
              {TYPE_TABS.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="flex-1">
                  <tab.icon
                    aria-hidden="true"
                    className={`mr-1.5 h-4 w-4 opacity-60 ${
                      tab.id === "income"
                        ? "text-icon-income"
                        : "text-icon-expense"
                    }`}
                  />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

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
      </section>

      {/* Content */}
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

      {/* Dialogs */}
      <CreateCategoryDialog
        open={createCategoryDialogOpen}
        onOpenChange={setCreateCategoryDialogOpen}
        onSuccess={() => setCreateCategoryDialogOpen(false)}
      />

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={handleDialogClose}
        category={selectedCategory}
        parentCategory={parentCategory}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
