"use client";

import { cn } from "@/lib/utils";
import { Building2, CreditCard, Sparkles, Wallet } from "lucide-react";

interface BankConfig {
  color: string;
  gradient: string;
  textColor: string;
  logo: string;
}

interface BankCardPreviewProps {
  bankName: string;
  bankConfig: BankConfig;
  balance: string;
  accountType: string;
  isVisible: boolean;
  userName: string;
  currency?: "BRL" | "USD";
}

export function BankCardPreview({
  bankName,
  bankConfig,
  balance,
  accountType,
  isVisible,
  userName,
  currency = "BRL",
}: BankCardPreviewProps) {
  const getAccountIcon = () => {
    switch (accountType) {
      case "credit":
        return <CreditCard className="h-5 w-5" />;
      case "savings":
        return <Wallet className="h-5 w-5" />;
      default:
        return <Building2 className="h-5 w-5" />;
    }
  };

  const getAccountLabel = () => {
    switch (accountType) {
      case "credit":
        return "Cartão de Crédito";
      case "savings":
        return "Poupança";
      default:
        return "Conta Corrente";
    }
  };

  return (
    <div
      className={cn(
        "relative transition-all duration-700 ease-out",
        isVisible
          ? "opacity-100 translate-x-0 scale-100"
          : "opacity-0 translate-x-8 scale-95",
      )}
    >
      {/* Glow effect behind the card */}
      <div
        className={cn(
          "absolute inset-0 blur-3xl opacity-30 transition-all duration-700 rounded-3xl",
          `bg-gradient-to-br ${bankConfig.gradient}`,
        )}
        style={{ transform: "scale(1.1)" }}
      />

      {/* Floating particles */}
      <div className="absolute -top-4 -right-4 animate-pulse">
        <Sparkles className="h-6 w-6 text-primary/60" />
      </div>
      <div className="absolute -bottom-2 -left-4 animate-pulse delay-300">
        <Sparkles className="h-4 w-4 text-primary/40" />
      </div>

      {/* Main Card */}
      <div
        className={cn(
          "relative w-[320px] h-[200px] rounded-2xl p-6 shadow-2xl transition-all duration-500",
          "bg-gradient-to-br",
          bankConfig.gradient,
          "transform hover:scale-105 hover:rotate-1",
        )}
        style={{
          boxShadow: `0 25px 50px -12px ${bankConfig.color}40`,
        }}
      >
        {/* Card pattern overlay */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <svg
            className="absolute inset-0 w-full h-full opacity-10"
            viewBox="0 0 400 300"
          >
            <title>Card pattern</title>
            <defs>
              <pattern
                id="card-pattern"
                x="0"
                y="0"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="20" cy="20" r="15" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#card-pattern)" />
          </svg>
        </div>

        {/* Card content */}
        <div className="relative h-full flex flex-col justify-between">
          {/* Top section */}
          <div className="flex justify-between items-start">
            <div
              className={cn(
                "text-2xl font-bold tracking-tight",
                bankConfig.textColor === "white"
                  ? "text-white"
                  : "text-zinc-900",
              )}
            >
              {bankConfig.logo || bankName.split(" ")[0] || "Banco"}
            </div>
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                bankConfig.textColor === "white"
                  ? "bg-white/20 text-white"
                  : "bg-black/10 text-zinc-900",
              )}
            >
              {getAccountIcon()}
              {getAccountLabel()}
            </div>
          </div>

          {/* Chip */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-9 rounded-md bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 shadow-inner flex items-center justify-center">
              <div className="w-8 h-6 border border-yellow-600/30 rounded-sm" />
            </div>
            <div
              className={cn(
                "text-sm opacity-80",
                bankConfig.textColor === "white"
                  ? "text-white"
                  : "text-zinc-900",
              )}
            >
              **** **** ****
            </div>
          </div>

          {/* Bottom section */}
          <div className="flex justify-between items-end">
            <div>
              <p
                className={cn(
                  "text-xs opacity-70 mb-0.5",
                  bankConfig.textColor === "white"
                    ? "text-white"
                    : "text-zinc-900",
                )}
              >
                Titular
              </p>
              <p
                className={cn(
                  "text-sm font-medium uppercase tracking-wide",
                  bankConfig.textColor === "white"
                    ? "text-white"
                    : "text-zinc-900",
                )}
              >
                {userName}
              </p>
            </div>
            <div className="text-right">
              <p
                className={cn(
                  "text-xs opacity-70 mb-0.5",
                  bankConfig.textColor === "white"
                    ? "text-white"
                    : "text-zinc-900",
                )}
              >
                Saldo
              </p>
              <p
                className={cn(
                  "text-lg font-bold",
                  bankConfig.textColor === "white"
                    ? "text-white"
                    : "text-zinc-900",
                )}
              >
                {currency === "USD" ? "$" : "R$"} {balance}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary floating card (decorative) */}
      <div
        className={cn(
          "absolute -bottom-6 -right-6 w-[280px] h-[170px] rounded-2xl -z-10",
          "bg-gradient-to-br opacity-40 blur-sm transition-all duration-500",
          bankConfig.gradient,
          "transform rotate-6",
        )}
      />

      {/* Hint text */}
      <div
        className={cn(
          "absolute -bottom-12 left-0 right-0 text-center text-sm text-muted-foreground",
          "transition-all duration-500",
          isVisible ? "opacity-100" : "opacity-0",
        )}
      >
        ✨ Cartão personalizado com as cores do seu banco
      </div>
    </div>
  );
}
