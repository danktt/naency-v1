import { IconFilter, IconRefresh, IconSearch } from "@tabler/icons-react";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export type FilterState = {
  categoryScope: "all" | "parents" | "children";
  type: "all" | "expense" | "income";
  status: "all" | "active" | "inactive";
  search: string;
};

type ProvisioningFiltersProps = {
  value: FilterState;
  onChange: (value: FilterState) => void;
  onReset?: () => void;
  disabled?: boolean;
};

const toggleClassName = "min-w-[88px] text-xs uppercase tracking-wide";

export function ProvisioningFilters({
  value,
  onChange,
  onReset,
  disabled,
}: ProvisioningFiltersProps) {
  const handleValueChange = useCallback(
    (partial: Partial<FilterState>) => {
      onChange({ ...value, ...partial });
    },
    [onChange, value],
  );

  return (
    <section className="space-y-4 rounded-lg border border-dashed border-border bg-muted/40 p-4">
      <header className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <IconFilter className="size-4" aria-hidden="true" />
        <span>Filtros e busca</span>
      </header>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Categoria
            </span>
            <ToggleGroup
              type="single"
              value={value.categoryScope}
              onValueChange={(scope) =>
                scope && handleValueChange({ categoryScope: scope as FilterState["categoryScope"] })
              }
              disabled={disabled}
              spacing={0}
              className="border border-border/80 bg-background/80"
            >
              <ToggleGroupItem value="all" className={toggleClassName}>
                Todos
              </ToggleGroupItem>
              <ToggleGroupItem value="parents" className={toggleClassName}>
                Pais
              </ToggleGroupItem>
              <ToggleGroupItem value="children" className={toggleClassName}>
                Filhos
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Tipo
            </span>
            <ToggleGroup
              type="single"
              value={value.type}
              onValueChange={(type) =>
                type && handleValueChange({ type: type as FilterState["type"] })
              }
              disabled={disabled}
              spacing={0}
              className="border border-border/80 bg-background/80"
            >
              <ToggleGroupItem value="all" className={toggleClassName}>
                Todos
              </ToggleGroupItem>
              <ToggleGroupItem value="expense" className={toggleClassName}>
                Despesa
              </ToggleGroupItem>
              <ToggleGroupItem value="income" className={toggleClassName}>
                Receita
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Status
            </span>
            <ToggleGroup
              type="single"
              value={value.status}
              onValueChange={(status) =>
                status && handleValueChange({ status: status as FilterState["status"] })
              }
              disabled={disabled}
              spacing={0}
              className="border border-border/80 bg-background/80"
            >
              <ToggleGroupItem value="all" className={toggleClassName}>
                Todos
              </ToggleGroupItem>
              <ToggleGroupItem value="active" className={toggleClassName}>
                Ativo
              </ToggleGroupItem>
              <ToggleGroupItem value="inactive" className={toggleClassName}>
                Inativo
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        <div className="flex w-full flex-col gap-3 sm:max-w-xs">
          <label
            htmlFor="provisioning-search"
            className="text-[11px] uppercase tracking-wide text-muted-foreground"
          >
            Buscar categoria
          </label>
          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring/50">
            <IconSearch className="size-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="provisioning-search"
              placeholder="Nome ou palavra-chave"
              value={value.search}
              onChange={(event) => handleValueChange({ search: event.target.value })}
              disabled={disabled}
              className="h-auto border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
            />
          </div>
          <Button
            type="button"
            variant="link"
            className={cn("justify-start px-0 text-xs text-muted-foreground")}
            onClick={onReset ?? (() => onChange({ categoryScope: "all", type: "all", status: "all", search: "" }))}
            disabled={disabled}
            icon={<IconRefresh className="size-4" aria-hidden="true" />}
          >
            Limpar filtros
          </Button>
        </div>
      </div>
    </section>
  );
}

