"use client";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import * as React from "react";

const CATEGORY_EMPTY_MESSAGE = "Nenhuma categoria cadastrada";

type CategorySource = {
  id: string;
  parent_id: string | null;
  name: string;
};

type CategoryGroup = {
  parent: CategorySource;
  children: CategorySource[];
};

type CategoryOptions = {
  standalone: Array<{ value: string; label: string }>;
  groups: Array<CategoryGroup>;
};

const buildCategoryOptions = (data: CategorySource[]): CategoryOptions => {
  if (!data?.length) {
    return { standalone: [], groups: [] };
  }

  const byId = new Map<string, CategorySource>();
  for (const category of data) {
    byId.set(category.id, category);
  }

  const childrenMap = new Map<string, CategorySource[]>();
  for (const category of data) {
    if (!category.parent_id) {
      continue;
    }
    const siblings = childrenMap.get(category.parent_id) ?? [];
    siblings.push(category);
    childrenMap.set(category.parent_id, siblings);
  }

  const standalone: Array<{ value: string; label: string }> = [];
  const groups: Array<CategoryGroup> = [];
  const processedChildren = new Set<string>();

  // Processar categorias pai
  for (const category of data) {
    if (category.parent_id) {
      continue;
    }

    const children = childrenMap.get(category.id);

    if (children?.length) {
      // Se tem filhos, criar um grupo
      const sortedChildren = [...children].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
      );
      groups.push({
        parent: category,
        children: sortedChildren,
      });
      sortedChildren.forEach((child) => {
        processedChildren.add(child.id);
      });
    } else {
      // Se não tem filhos, adicionar como standalone
      standalone.push({ value: category.id, label: category.name });
    }
  }

  // Processar categorias filhas órfãs (pai não encontrado ou não processado)
  for (const category of data) {
    if (!category.parent_id || processedChildren.has(category.id)) {
      continue;
    }

    const parent = byId.get(category.parent_id);
    if (parent) {
      // Se o pai existe mas não foi processado, criar grupo para ele
      const existingGroup = groups.find((g) => g.parent.id === parent.id);
      if (existingGroup) {
        existingGroup.children.push(category);
      } else {
        groups.push({
          parent,
          children: [category],
        });
      }
      processedChildren.add(category.id);
    } else {
      // Pai não encontrado, adicionar como standalone
      standalone.push({
        value: category.id,
        label: category.name,
      });
    }
  }

  return { standalone, groups };
};

export type CategoriesSelectProps = {
  type: "income" | "expense";
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  includeInactive?: boolean;
};

export function CategoriesSelect({
  type,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  id,
  className,
  includeInactive,
}: CategoriesSelectProps) {
  const { data, isLoading, isError } = trpc.categories.list.useQuery(
    { type, includeInactive },
    { staleTime: 1_000 * 60 * 5 },
  );

  const categoryOptions = React.useMemo(
    () => buildCategoryOptions(data ?? []),
    [data],
  );

  const handleValueChange = React.useCallback(
    (nextValue: string) => {
      onChange?.(nextValue);
    },
    [onChange],
  );

  const selectPlaceholder = React.useMemo(() => {
    if (placeholder) {
      return placeholder;
    }

    if (isLoading) {
      return "Carregando categorias...";
    }

    if (isError) {
      return "Não foi possível carregar as categorias";
    }

    const totalOptions =
      categoryOptions.standalone.length + categoryOptions.groups.length;
    if (totalOptions === 0) {
      return CATEGORY_EMPTY_MESSAGE;
    }

    return "Selecione uma categoria";
  }, [placeholder, isLoading, isError, categoryOptions]);

  const isSelectDisabled = disabled || isLoading;

  if (isLoading) {
    return <Skeleton className={cn("h-9 w-full", className)} />;
  }

  return (
    <Select
      value={value ?? undefined}
      onValueChange={handleValueChange}
      disabled={isSelectDisabled}
    >
      <SelectTrigger
        id={id}
        onBlur={onBlur}
        className={cn("w-full", className)}
      >
        <SelectValue placeholder={selectPlaceholder} />
      </SelectTrigger>
      <SelectContent>
        {isError ? (
          <SelectItem value="__error" disabled>
            Error loading categories
          </SelectItem>
        ) : categoryOptions.standalone.length > 0 ||
          categoryOptions.groups.length > 0 ? (
          <>
            {/* Categorias standalone (sem filhos) */}
            {categoryOptions.standalone.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}

            {/* Grupos de categorias (pai + filhos) */}
            {categoryOptions.groups.map((group) => (
              <SelectGroup key={group.parent.id}>
                <SelectLabel>{group.parent.name}</SelectLabel>
                {/* Opções para as categorias filhas */}
                {group.children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </>
        ) : (
          <SelectItem value="__empty" disabled>
            {CATEGORY_EMPTY_MESSAGE}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
