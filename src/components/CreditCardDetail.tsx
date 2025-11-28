import { formatCurrency } from "@/helpers/formatCurrency";
import { cn } from "@/lib/utils";

interface CreditCardDetailProps {
  name: string;
  brand?: string | null;
  creditLimit: number;
  availableLimit: number;
  currency: "BRL" | "USD" | "EUR";
  closingDay?: number | null;
  dueDay?: number | null;
  transactionAmount?: number;
  className?: string;
}

export function CreditCardDetail({
  name,
  brand,
  creditLimit,
  availableLimit,
  currency,
  closingDay,
  dueDay,
  transactionAmount = 0,
  className,
}: CreditCardDetailProps) {
  const projectedAvailable = availableLimit - transactionAmount;
  const usedLimit = creditLimit - projectedAvailable;
  const usagePercentage = creditLimit > 0 ? (usedLimit / creditLimit) * 100 : 0;

  // Generate a somewhat realistic looking masked number
  const maskedNumber =
    "**** **** **** " + (name.length > 4 ? name.slice(0, 4) : "1234");

  return (
    <div className={cn("flex flex-col gap-6 p-4", className)}>
      <h3 className="text-lg font-semibold">Detalhes do Cartão</h3>

      {/* Card Visual */}
      <div className="relative w-full aspect-[1.586/1] rounded-2xl bg-linear-to-br from-blue-600 to-purple-700 p-6 text-white shadow-lg overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-black/10 rounded-full blur-2xl" />

        <div className="relative flex flex-col justify-between h-full">
          <div className="flex justify-between items-start">
            <div className="w-12 h-9 bg-yellow-400/80 rounded-md flex items-center justify-center">
              <div className="w-8 h-6 border border-black/20 rounded-sm grid grid-cols-3 grid-rows-2 gap-px">
                <div className="border-r border-black/10 col-span-1 row-span-2"></div>
                <div className="border-r border-black/10 col-span-1 row-span-2"></div>
              </div>
            </div>
            <span className="font-mono text-lg tracking-wider">
              {brand?.toUpperCase() || "CARD"}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-4">
              <span className="font-mono text-xl sm:text-2xl tracking-widest shadow-black/10 drop-shadow-md">
                {maskedNumber}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase opacity-80">Titular</span>
              <span className="font-medium tracking-wide uppercase truncate max-w-[200px]">
                {name}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase opacity-80">Validade</span>
              <span className="font-mono font-medium">
                {closingDay && dueDay
                  ? `${String(dueDay).padStart(2, "0")}/--`
                  : "**/**"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Limit Details */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-medium text-muted-foreground">
            Limite Utilizado
          </h4>
        </div>

        <div className="space-y-2">
          {/* Custom segmented progress bar look */}
          <div className="h-8 w-full flex gap-1">
            {Array.from({ length: 20 }).map((_, i) => {
              const barValue = (i + 1) * 5; // 5%, 10%, ..., 100%
              const isActive = barValue <= usagePercentage;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded-sm transition-all duration-500",
                    isActive ? "bg-primary" : "bg-muted",
                  )}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="font-semibold text-primary">
              {formatCurrency(usedLimit, currency)}
            </span>
            <span className="text-muted-foreground">
              de {formatCurrency(creditLimit, currency)}
            </span>
          </div>
          <div className="flex justify-end">
            <span className="text-xs font-medium text-muted-foreground">
              {Math.round(usagePercentage)}% utilizado
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Disponível</p>
            <p
              className={cn(
                "text-lg font-semibold",
                projectedAvailable < 0
                  ? "text-destructive"
                  : "text-emerald-600",
              )}
            >
              {formatCurrency(projectedAvailable, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fechamento</p>
            <p className="text-lg font-semibold">Dia {closingDay || "--"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
