import { IconMinus, IconPlus } from "@tabler/icons-react";
import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

type NumberInputCounterProps = {
  value?: number | null;
  onChange: (value: number | undefined) => void;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  name?: string;
  minValue?: number;
  disabled?: boolean;
  inputProps?: React.ComponentProps<typeof Input>;
};

const NumberInputCounter = React.forwardRef<
  HTMLInputElement,
  NumberInputCounterProps
>(
  (
    {
      value,
      onChange,
      onBlur,
      name,
      minValue = 0,
      disabled = false,
      inputProps,
    },
    ref,
  ) => {
    const parsedValue =
      typeof value === "number" && !Number.isNaN(value) ? value : undefined;

    const handleIncrement = () => {
      const current = parsedValue ?? minValue;
      onChange(Math.max(minValue, current + 1));
    };

    const handleDecrement = () => {
      const current = parsedValue ?? minValue;
      const nextValue = current - 1;
      onChange(nextValue < minValue ? minValue : nextValue);
    };

    const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      const nextValue = event.target.value;
      if (nextValue === "") {
        onChange(undefined);
        return;
      }

      const numericValue = Number(nextValue);
      if (!Number.isNaN(numericValue)) {
        onChange(numericValue);
      }
    };

    return (
      <div className="*:not-first:mt-2">
        <div className="relative inline-flex h-9 w-full items-center overflow-hidden rounded-md border border-input text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
          <button
            type="button"
            onClick={handleDecrement}
            className="-ms-px flex aspect-square h-[inherit] cursor-pointer items-center justify-center rounded-s-md border border-input dark:bg-input/30 bg-background text-sm text-muted-foreground/80 transition-[color,box-shadow] hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled || (parsedValue ?? minValue) <= minValue}
            aria-label="Decrement value"
          >
            <IconMinus size={16} aria-hidden="true" />
          </button>
          <Input
            {...inputProps}
            ref={ref}
            type="number"
            value={parsedValue ?? ""}
            onChange={handleInputChange}
            onBlur={onBlur}
            name={name}
            disabled={disabled}
            className={cn(
              "w-full grow bg-background rounded-none no-spinner px-3 py-2 text-center text-foreground tabular-nums",
              inputProps?.className,
            )}
            min={minValue}
          />
          <button
            type="button"
            onClick={handleIncrement}
            className="-me-px flex aspect-square dark:bg-input/30 cursor-pointer h-[inherit] items-center justify-center rounded-e-md border border-input bg-background text-sm text-muted-foreground/80 transition-[color,box-shadow] hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled}
            aria-label="Increment value"
          >
            <IconPlus size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  },
);

NumberInputCounter.displayName = "NumberInputCounter";

export { Input, NumberInputCounter };
