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
import { formatCurrency } from "@/helpers/formatCurrency";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import * as React from "react";

const ACCOUNT_EMPTY_MESSAGE = "Nenhuma conta bancária cadastrada";

export type BankAccountSelectProps = {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
};

export function BankAccountSelect({
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  id,
  className,
}: BankAccountSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const { data, isLoading, isError } = trpc.accounts.list.useQuery(undefined, {
    staleTime: 1_000 * 60 * 5,
  });

  const filteredAccounts = React.useMemo(() => {
    if (!data?.length) return [];

    if (!search.trim()) {
      return data;
    }

    const searchLower = search.toLowerCase().trim();
    return data.filter((account) =>
      account.name.toLowerCase().includes(searchLower),
    );
  }, [data, search]);

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
    if (isLoading) return "Carregando contas...";
    if (isError) return "Não foi possível carregar as contas";
    if (!data?.length) return ACCOUNT_EMPTY_MESSAGE;
    return "Selecione uma conta bancária";
  }, [placeholder, isLoading, isError, data]);

  const selectedAccount = React.useMemo(() => {
    if (!value || !data?.length) return undefined;
    return data.find((account) => account.id === value);
  }, [value, data]);

  const getBalanceColor = React.useCallback((balance: number) => {
    if (balance < 0) return "text-text-negative";
    if (balance > 0) return "text-text-positive";
    return "text-muted-foreground";
  }, []);

  const isSelectDisabled = disabled || isLoading;

  if (isLoading) {
    return <Skeleton className={cn("h-9 w-full", className)} />;
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
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
          {selectedAccount ? (
            <span className="truncate">
              {selectedAccount.name} •{" "}
              <span
                className={getBalanceColor(selectedAccount.current_balance)}
              >
                {formatCurrency(
                  selectedAccount.current_balance,
                  selectedAccount.currency,
                )}
              </span>
            </span>
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
            placeholder="Buscar conta..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {isError
                ? "Erro ao carregar contas"
                : search.trim()
                  ? "Nenhuma conta encontrada"
                  : ACCOUNT_EMPTY_MESSAGE}
            </CommandEmpty>

            {filteredAccounts.length > 0 && (
              <CommandGroup>
                {filteredAccounts.map((account) => (
                  <CommandItem
                    key={account.id}
                    value={account.id}
                    onSelect={handleValueChange}
                  >
                    <CheckIcon
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === account.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-1 items-center justify-between">
                      <span className="truncate">{account.name}</span>
                      <span
                        className={cn(
                          "ml-2 shrink-0",
                          getBalanceColor(account.current_balance),
                        )}
                      >
                        {formatCurrency(
                          account.current_balance,
                          account.currency,
                        )}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
