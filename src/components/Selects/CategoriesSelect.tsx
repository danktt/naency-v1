"use client";
import {
  Select,
  SelectContent,
  SelectItem,
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

const buildCategoryOptions = (
  data: CategorySource[],
): Array<{ value: string; label: string }> => {
  if (!data?.length) {
    return [];
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

  const options: Array<{ value: string; label: string }> = [];
  const processedChildren = new Set<string>();

  for (const category of data) {
    if (category.parent_id) {
      continue;
    }

    options.push({ value: category.id, label: category.name });

    const children = childrenMap.get(category.id);

    if (!children?.length) {
      continue;
    }

    children
      .sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
      )
      .forEach((child) => {
        processedChildren.add(child.id);
        options.push({
          value: child.id,
          label: `${category.name} • ${child.name}`,
        });
      });
  }

  for (const category of data) {
    if (!category.parent_id || processedChildren.has(category.id)) {
      continue;
    }

    const parent = byId.get(category.parent_id);
    const parentName = parent?.name ?? "Category";
    options.push({
      value: category.id,
      label: `${parentName} • ${category.name}`,
    });
  }

  return options;
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
  console.log(data);
  const options = React.useMemo(() => buildCategoryOptions(data ?? []), [data]);

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

    if (!options.length) {
      return CATEGORY_EMPTY_MESSAGE;
    }

    return "Selecione uma categoria";
  }, [placeholder, isLoading, isError, options.length]);

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
        ) : options.length ? (
          options.map(
            (option) => (
              console.log(option),
              (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              )
            ),
          )
        ) : (
          <SelectItem value="__empty" disabled>
            {CATEGORY_EMPTY_MESSAGE}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
