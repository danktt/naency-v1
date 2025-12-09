"use client";

import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calculator, Copy } from "lucide-react";
import * as React from "react";
import { type Control, type Path, useController } from "react-hook-form";

const currencyOptions: {
  label: string;
  value: "BRL" | "USD";
  symbol: string;
  locale: string;
}[] = [
  { label: "BRL", value: "BRL", symbol: "R$", locale: "pt-BR" },
  { label: "USD", value: "USD", symbol: "$", locale: "en-US" },
];

/**
 * Formats cents as numeric string (no symbol).
 */
function formatCentsValueOnly(cents: number, currency: "BRL" | "USD") {
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
  isInstallment?: boolean;
  totalInstallments?: number;
}

export function FieldCurrencyAmount<T extends Record<string, unknown>>({
  control,
  amountName,
  currencyName,
  label = "Amount",
  required = false,
  disabled = false,
  className,
  isInstallment = false,
  totalInstallments = 1,
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
    (currencyField.value as "BRL" | "USD" | undefined) ??
    currencyOptions[0].value;

  // Calculate installment value if applicable
  const installmentValue = React.useMemo(() => {
    if (!isInstallment || !totalInstallments || totalInstallments < 2) {
      return null;
    }
    const totalAmount = Number(amountField.value ?? 0) / 100;
    const dividedAmount = totalAmount / totalInstallments;
    return formatCentsValueOnly(Math.round(dividedAmount * 100), currencyValue);
  }, [isInstallment, totalInstallments, amountField.value, currencyValue]);

  // Calculator State
  const [display, setDisplay] = React.useState("0");
  const [currentValue, setCurrentValue] = React.useState("");
  const [operator, setOperator] = React.useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      // Initialize calculator with current field value
      const val = Number(amountField.value ?? 0) / 100;
      setDisplay(val.toString());
      setCurrentValue("");
      setOperator(null);
      setWaitingForOperand(false);
    }
  }, [open, amountField.value]);

  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleCopyToInput();
        return;
      }

      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleNumber(e.key);
      } else if (e.key === "+" || e.key === "-") {
        e.preventDefault();
        handleOperator(e.key);
      } else if (e.key === "*" || e.key === "x" || e.key === "X") {
        e.preventDefault();
        handleOperator("×");
      } else if (e.key === "/" || e.key === "÷") {
        e.preventDefault();
        handleOperator("÷");
      } else if (e.key === "." || e.key === ",") {
        e.preventDefault();
        handleDecimal();
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        handleEquals();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleClear();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, display, currentValue, operator, waitingForOperand]);

  const handleNumber = (num: string) => {
    if (waitingForOperand) {
      setDisplay(num);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? num : display + num);
    }
  };

  const handleDecimal = () => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
    } else if (display.indexOf(".") === -1) {
      setDisplay(display + ".");
    }
  };

  const handleOperator = (nextOperator: string) => {
    const inputValue = Number.parseFloat(display);

    if (currentValue === "") {
      setCurrentValue(String(inputValue));
    } else if (operator) {
      const current = Number.parseFloat(currentValue);
      let newValue = current;

      switch (operator) {
        case "+":
          newValue = current + inputValue;
          break;
        case "-":
          newValue = current - inputValue;
          break;
        case "×":
          newValue = current * inputValue;
          break;
        case "÷":
          newValue = inputValue !== 0 ? current / inputValue : current;
          break;
        default:
          break;
      }

      setDisplay(String(newValue));
      setCurrentValue(String(newValue));
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  const handleEquals = () => {
    const inputValue = Number.parseFloat(display);

    if (operator && currentValue !== "") {
      const current = Number.parseFloat(currentValue);
      let newValue = current;

      switch (operator) {
        case "+":
          newValue = current + inputValue;
          break;
        case "-":
          newValue = current - inputValue;
          break;
        case "×":
          newValue = current * inputValue;
          break;
        case "÷":
          newValue = inputValue !== 0 ? current / inputValue : current;
          break;
        default:
          break;
      }

      setDisplay(String(newValue));
      setCurrentValue("");
      setOperator(null);
      setWaitingForOperand(true);
    }
  };

  const handleClear = () => {
    setDisplay("0");
    setCurrentValue("");
    setOperator(null);
    setWaitingForOperand(false);
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay("0");
    }
  };

  const handleCopyToInput = () => {
    const val = Number.parseFloat(display);
    if (!Number.isNaN(val)) {
      // Convert to cents
      const cents = Math.round(val * 100);
      amountField.onChange(cents);
    }
    setOpen(false);
  };

  return (
    <FormField
      control={control}
      name={amountName}
      render={() => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required && <span className="text-destructive"> *</span>}

            <span className="text-xs text-muted-foreground">
              {installmentValue && (
                <span className="ml-2">
                  (Parcela:{" "}
                  {currencyOptions.find((opt) => opt.value === currencyValue)
                    ?.symbol ?? ""}
                  {installmentValue})
                </span>
              )}
            </span>
          </FormLabel>

          {/* Prefix symbol */}
          <div className="relative flex rounded-md shadow-xs">
            <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground text-sm">
              R$
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
                className="-me-px rounded-e-none ps-8 shadow-none"
                aria-invalid={Boolean(amountState.error)}
              />
            </FormControl>

            {/* Calculator Popover */}
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-s-none border-input bg-background px-3 text-muted-foreground hover:text-foreground"
                  aria-label="Abrir calculadora"
                  disabled={disabled}
                >
                  <Calculator className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-52 p-2"
                align="end"
                side="bottom"
                sideOffset={8}
              >
                <div className="space-y-1.5">
                  <div
                    className="rounded-md bg-muted px-2.5 py-1.5 text-right text-lg font-semibold tabular-nums"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {display}
                  </div>
                  <Button
                    onClick={handleCopyToInput}
                    className="h-7 w-full text-xs"
                    size="sm"
                    aria-label="Copiar valor para o campo (Cmd+Enter ou Ctrl+Enter)"
                  >
                    <Copy className="mr-1.5 h-3 w-3" />
                    <span>Copiar</span>
                    <kbd className="ml-auto rounded border border-border bg-background px-1 text-[10px] font-mono text-muted-foreground">
                      {typeof navigator !== "undefined" &&
                      navigator.platform.includes("Mac")
                        ? "⌘"
                        : "Ctrl"}
                      +↵
                    </kbd>
                  </Button>
                  <div className="grid grid-cols-4 gap-1">
                    {/* Linha 1 */}
                    <Button
                      onClick={handleClear}
                      variant="secondary"
                      className="col-span-2 h-8 text-xs"
                      aria-label="Limpar"
                    >
                      C
                    </Button>
                    <Button
                      onClick={handleBackspace}
                      variant="secondary"
                      className="h-8 text-xs"
                      aria-label="Apagar último dígito"
                    >
                      ⌫
                    </Button>
                    <Button
                      onClick={() => handleOperator("÷")}
                      variant="secondary"
                      className="h-8 text-xs"
                      aria-label="Dividir"
                    >
                      ÷
                    </Button>
                    {/* Linha 2 */}
                    <Button
                      onClick={() => handleNumber("7")}
                      variant="outline"
                      className="h-8 text-xs"
                      aria-label="7"
                    >
                      7
                    </Button>
                    <Button
                      onClick={() => handleNumber("8")}
                      variant="outline"
                      className="h-8 text-xs"
                      aria-label="8"
                    >
                      8
                    </Button>
                    <Button
                      onClick={() => handleNumber("9")}
                      variant="outline"
                      className="h-8 text-xs"
                      aria-label="9"
                    >
                      9
                    </Button>
                    <Button
                      onClick={() => handleOperator("×")}
                      variant="secondary"
                      className="h-8 text-xs"
                      aria-label="Multiplicar"
                    >
                      ×
                    </Button>
                    {/* Linha 3 */}
                    <Button
                      onClick={() => handleNumber("4")}
                      variant="outline"
                      className="h-8 text-xs"
                      aria-label="4"
                    >
                      4
                    </Button>
                    <Button
                      onClick={() => handleNumber("5")}
                      variant="outline"
                      className="h-8 text-xs"
                      aria-label="5"
                    >
                      5
                    </Button>
                    <Button
                      onClick={() => handleNumber("6")}
                      variant="outline"
                      className="h-8 text-xs"
                      aria-label="6"
                    >
                      6
                    </Button>
                    <Button
                      onClick={() => handleOperator("-")}
                      variant="secondary"
                      className="h-8 text-xs"
                      aria-label="Subtrair"
                    >
                      -
                    </Button>
                    {/* Linha 4 */}
                    <Button
                      onClick={() => handleNumber("1")}
                      variant="outline"
                      className="h-8 text-xs"
                      aria-label="1"
                    >
                      1
                    </Button>
                    <Button
                      onClick={() => handleNumber("2")}
                      variant="outline"
                      className="h-8 text-xs"
                      aria-label="2"
                    >
                      2
                    </Button>
                    <Button
                      onClick={() => handleNumber("3")}
                      variant="outline"
                      className="h-8 text-xs"
                      aria-label="3"
                    >
                      3
                    </Button>
                    <Button
                      onClick={() => handleOperator("+")}
                      variant="secondary"
                      className="h-8 text-xs"
                      aria-label="Somar"
                    >
                      +
                    </Button>
                    {/* Linha 5 */}
                    <Button
                      onClick={() => handleNumber("0")}
                      variant="outline"
                      className="col-span-2 h-8 text-xs"
                      aria-label="0"
                    >
                      0
                    </Button>
                    <Button
                      onClick={handleDecimal}
                      variant="outline"
                      className="h-8 text-xs bg-transparent"
                      aria-label="Ponto decimal"
                    >
                      .
                    </Button>
                    <Button
                      onClick={handleEquals}
                      variant="default"
                      className="h-8 text-xs"
                      aria-label="Igual"
                    >
                      =
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <FormMessage />
        </FormItem>
      )}
    />
  );
}
