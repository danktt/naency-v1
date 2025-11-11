"use client";

import { type Control, type Path, useController } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type CurrencyOption = {
  label: string;
  value: "BRL" | "USD";
  symbol: string;
  locale: string;
};

const currencyOptions: CurrencyOption[] = [
  { label: "BRL", value: "BRL", symbol: "R$", locale: "pt-BR" },
  { label: "USD", value: "USD", symbol: "$", locale: "en-US" },
];

/**
 * Formats cents as numeric string (no symbol).
 */
function formatCentsValueOnly(
  cents: number,
  currency: CurrencyOption["value"],
) {
  const amount = (cents || 0) / 100;
  const locale = currency === "USD" ? "en-US" : "pt-BR";

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Parse strings like "1.234,56" or "1,234.56" → cents
 */
function parseCurrencyToCentsLocal(s: string) {
  if (!s) return 0;
  const digits = s.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

interface FieldCurrencyAmountProps<T extends Record<string, unknown>> {
  control: Control<T, unknown>;
  amountName: Path<T>;
  currencyName: Path<T>;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function FieldCurrencyAmount<T extends Record<string, unknown>>({
  control,
  amountName,
  currencyName,
  label = "Amount",
  required = false,
  disabled = false,
  className,
}: FieldCurrencyAmountProps<T>) {
  const { field: amountField, fieldState: amountState } = useController({
    name: amountName,
    control,
  });

  const { field: currencyField } = useController({
    name: currencyName,
    control,
  });

  const currencyValue =
    (currencyField.value as CurrencyOption["value"] | undefined) ??
    currencyOptions[0].value;
  const currentCurrency =
    currencyOptions.find((c) => c.value === currencyValue) ??
    currencyOptions[0];

  return (
    <FormField
      control={control}
      name={amountName}
      render={() => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required && <span className="text-destructive"> *</span>}
          </FormLabel>

          <div className="relative flex rounded-md shadow-xs ">
            {/* Prefix symbol */}
            <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-sm text-muted-foreground">
              {currentCurrency.symbol}
            </span>

            <FormControl className="flex-1">
              <Input
                value={formatCentsValueOnly(
                  Number(amountField.value ?? 0),
                  currencyValue,
                )}
                onChange={(e) => {
                  const cents = parseCurrencyToCentsLocal(e.target.value);
                  amountField.onChange(cents);
                }}
                onBlur={amountField.onBlur}
                inputMode="numeric"
                disabled={disabled}
                className="rounded-e-none ps-8"
                aria-invalid={Boolean(amountState.error)}
              />
            </FormControl>

            {/* Currency selector */}
            <div className="shrink-0">
              <Select
                value={currencyValue}
                onValueChange={(value) => currencyField.onChange(value)}
                disabled={disabled}
              >
                <SelectTrigger
                  className={cn(
                    "rounded-s-none border border-input bg-background px-3 text-sm text-muted-foreground shadow-none w-[96px]",
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <FormMessage />
        </FormItem>
      )}
    />
  );
}
