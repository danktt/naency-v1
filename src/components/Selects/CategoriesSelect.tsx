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

const CATEGORY_EMPTY_MESSAGE = "Nenhuma categoria cadastrada";

type CategorySource = {
  id: string;
  parent_id: string | null;
  name: string;
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

  if (isLoading) {
    return <Skeleton className={cn("h-9 w-full", className)} />;
  }

  // ERRO (não carrega ou falha)
  if (isError || !data || data.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger className={cn("w-full", className)}>
          <SelectValue placeholder={CATEGORY_EMPTY_MESSAGE} />
        </SelectTrigger>
      </Select>
    );
  }

  // Agrupa categorias pelo parent_id para separar pais dos filhos
  const parents = (data ?? []).filter((cat) => !cat.parent_id);
  const childrenMap: Record<string, CategorySource[]> = {};
  (data ?? []).forEach((cat) => {
    if (cat.parent_id) {
      if (!childrenMap[cat.parent_id]) childrenMap[cat.parent_id] = [];
      childrenMap[cat.parent_id].push(cat);
    }
  });

  const hasAny = parents.length > 0 || (data ?? []).length > 0;

  // Categorias completamente órfãs
  const orphanChildren =
    (data ?? []).filter(
      (cat) =>
        cat.parent_id &&
        (!parents.find((p) => p.id === cat.parent_id) ||
          !childrenMap[cat.parent_id]),
    ) || [];

  return (
    <Select
      value={value ?? ""}
      onValueChange={onChange}
      disabled={disabled}
      defaultValue=""
    >
      <SelectTrigger
        id={id}
        className={cn("w-full", className)}
        onBlur={onBlur}
      >
        <SelectValue
          placeholder={
            placeholder ||
            (!hasAny ? CATEGORY_EMPTY_MESSAGE : "Selecione uma categoria")
          }
        />
      </SelectTrigger>
      <SelectContent>
        {/* Pais com filhos */}
        {parents.map((parent) =>
          childrenMap[parent.id] && childrenMap[parent.id].length > 0 ? (
            <SelectGroup key={parent.id}>
              <SelectLabel>{parent.name}</SelectLabel>
              {childrenMap[parent.id]
                .slice()
                .sort((a, b) =>
                  a.name.localeCompare(b.name, "pt-BR", {
                    sensitivity: "base",
                  }),
                )
                .map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.name}
                  </SelectItem>
                ))}
            </SelectGroup>
          ) : (
            // Pais sem filhos (standalone)
            <SelectItem key={parent.id} value={parent.id}>
              {parent.name}
            </SelectItem>
          ),
        )}
        {/* Categorias órfãs */}
        {orphanChildren.map((cat) => (
          <SelectItem key={cat.id} value={cat.id}>
            {cat.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
