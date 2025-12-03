"use client";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import * as React from "react";
import { Fragment } from "react";

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

  for (const category of data) {
    if (category.parent_id) {
      continue;
    }

    const children = childrenMap.get(category.id);

    if (children?.length) {
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
      standalone.push({ value: category.id, label: category.name });
    }
  }

  for (const category of data) {
    if (!category.parent_id || processedChildren.has(category.id)) {
      continue;
    }

    const parent = byId.get(category.parent_id);
    if (parent) {
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
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const { data, isLoading, isError } = trpc.categories.list.useQuery(
    { type, includeInactive },
    { staleTime: 1_000 * 60 * 5 },
  );

  const categoryOptions = React.useMemo(
    () => buildCategoryOptions(data ?? []),
    [data],
  );

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) {
      return categoryOptions;
    }

    const searchLower = search.toLowerCase().trim();
    const filteredStandalone = categoryOptions.standalone.filter((option) =>
      option.label.toLowerCase().includes(searchLower),
    );

    const filteredGroups = categoryOptions.groups
      .map((group) => {
        const parentMatches = group.parent.name
          .toLowerCase()
          .includes(searchLower);
        const filteredChildren = group.children.filter((child) =>
          child.name.toLowerCase().includes(searchLower),
        );

        if (parentMatches || filteredChildren.length > 0) {
          return {
            parent: group.parent,
            children: parentMatches ? group.children : filteredChildren,
          };
        }
        return null;
      })
      .filter((group): group is CategoryGroup => group !== null);

    return {
      standalone: filteredStandalone,
      groups: filteredGroups,
    };
  }, [categoryOptions, search]);

  const handleValueChange = React.useCallback(
    (nextValue: string) => {
      onChange?.(nextValue);
      setOpen(false);
      setSearch("");
    },
    [onChange],
  );

  const selectPlaceholder = React.useMemo(() => {
    if (placeholder) return placeholder;
    if (isLoading) return "Carregando categorias...";
    if (isError) return "Não foi possível carregar as categorias";
    const totalOptions =
      categoryOptions.standalone.length + categoryOptions.groups.length;
    if (totalOptions === 0) return CATEGORY_EMPTY_MESSAGE;
    return "Selecione uma categoria";
  }, [placeholder, isLoading, isError, categoryOptions]);

  const selectedCategoryName = React.useMemo(() => {
    if (!value) return undefined;
    const standalone = categoryOptions.standalone.find(
      (opt) => opt.value === value,
    );
    if (standalone) return standalone.label;
    for (const group of categoryOptions.groups) {
      const child = group.children.find((c) => c.id === value);
      if (child) return child.name;
    }
    return undefined;
  }, [value, categoryOptions]);

  const isSelectDisabled = disabled || isLoading;

  if (isLoading) {
    return <Skeleton className={cn("h-9 w-full", className)} />;
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={isSelectDisabled}
          onBlur={onBlur}
          className={cn(
            "w-full justify-between border-input bg-background px-3 font-normal outline-none outline-offset-0 hover:bg-background focus-visible:outline-[3px]",
            className,
          )}
        >
          {selectedCategoryName ? (
            <span className="truncate">{selectedCategoryName} </span>
          ) : (
            <span className="text-muted-foreground">{selectPlaceholder}</span>
          )}
          <ChevronDownIcon
            aria-hidden="true"
            className="shrink-0 text-muted-foreground/80"
            size={16}
          />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={4}
        avoidCollisions={false}
        className="w-full min-w-(--radix-popper-anchor-width) border-input p-0"
      >
        <Command shouldFilter={false} className="overflow-visible">
          <CommandInput
            placeholder="Buscar categoria..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {isError
                ? "Erro ao carregar categorias"
                : search.trim()
                  ? "Nenhuma categoria encontrada"
                  : CATEGORY_EMPTY_MESSAGE}
            </CommandEmpty>

            {filteredOptions.standalone.length > 0 && (
              <CommandGroup>
                {filteredOptions.standalone.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={handleValueChange}
                  >
                    {/* Ícone ANTES do texto para garantir alinhamento estável */}
                    <CheckIcon
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === option.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredOptions.groups.map((group) => (
              <Fragment key={group.parent.id}>
                <CommandGroup heading={group.parent.name}>
                  {group.children.map((child) => (
                    <CommandItem
                      key={child.id}
                      value={child.id}
                      onSelect={handleValueChange}
                    >
                      {/* Ícone ANTES do texto */}
                      <CheckIcon
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          value === child.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {child.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Fragment>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
