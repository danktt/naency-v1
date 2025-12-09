"use client";

import { useMemo } from "react";
import { BankCardPreview } from "./BankAccountCard";

const bankBrands: Record<
  string,
  { color: string; gradient: string; textColor: string; logo: string }
> = {
  nubank: {
    color: "#8A05BE",
    gradient: "from-purple-600 via-purple-500 to-fuchsia-500",
    textColor: "white",
    logo: "Nu",
  },
  bradesco: {
    color: "#CC092F",
    gradient: "from-red-600 via-red-500 to-rose-400",
    textColor: "white",
    logo: "Bradesco",
  },
  itau: {
    color: "#EC7000",
    gradient: "from-orange-500 via-orange-400 to-amber-400",
    textColor: "white",
    logo: "Itaú",
  },
  santander: {
    color: "#EC0000",
    gradient: "from-red-600 via-red-500 to-red-400",
    textColor: "white",
    logo: "Santander",
  },
  inter: {
    color: "#FF7A00",
    gradient: "from-orange-500 via-orange-400 to-yellow-400",
    textColor: "white",
    logo: "Inter",
  },
  c6: {
    color: "#1A1A1A",
    gradient: "from-zinc-800 via-zinc-700 to-zinc-600",
    textColor: "white",
    logo: "C6",
  },
  caixa: {
    color: "#005CA9",
    gradient: "from-blue-600 via-blue-500 to-cyan-400",
    textColor: "white",
    logo: "Caixa",
  },
  bb: {
    color: "#FFCC00",
    gradient: "from-yellow-400 via-yellow-300 to-amber-300",
    textColor: "black",
    logo: "BB",
  },
  picpay: {
    color: "#21C25E",
    gradient: "from-green-500 via-emerald-400 to-teal-400",
    textColor: "white",
    logo: "PicPay",
  },
  neon: {
    color: "#00D2FF",
    gradient: "from-cyan-400 via-sky-400 to-blue-400",
    textColor: "white",
    logo: "Neon",
  },
  nomad: {
    color: "#FFCE02",
    gradient: "from-yellow-400 via-yellow-300 to-amber-300",
    textColor: "white",
    logo: "Nomad",
  },
  default: {
    color: "#3B82F6",
    gradient: "from-zinc-700 via-zinc-600 to-zinc-500",
    textColor: "white",
    logo: "",
  },
};

function detectBank(name: string): string {
  const normalized = name.toLowerCase().trim();
  if (normalized.includes("nubank") || normalized.includes("nu "))
    return "nubank";
  if (normalized.includes("bradesco")) return "bradesco";
  if (normalized.includes("itaú") || normalized.includes("itau")) return "itau";
  if (normalized.includes("santander")) return "santander";
  if (normalized.includes("inter")) return "inter";
  if (normalized.includes("c6")) return "c6";
  if (normalized.includes("caixa")) return "caixa";
  if (normalized.includes("brasil") || normalized.includes("bb")) return "bb";
  if (normalized.includes("picpay")) return "picpay";
  if (normalized.includes("neon")) return "neon";
  if (normalized.includes("nomad")) return "nomad";
  return "default";
}

interface BankAccountSetupProps {
  userName?: string;
  accountName?: string;
  balance?: number;
  accountType?: string;
  currency?: "BRL" | "USD";
}

export function BankAccountSetup({
  userName = "Usuário",
  accountName = "",
  balance = 0,
  accountType = "checking",
  currency = "BRL",
}: BankAccountSetupProps) {
  const detectedBank = useMemo(() => detectBank(accountName), [accountName]);
  const bankConfig = bankBrands[detectedBank] || bankBrands.default;

  // Format balance for display
  const formattedBalance = useMemo(() => {
    const value = balance / 100; // Convert from centavos to reais/dollars
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }, [balance]);

  const showCard = accountName.length > 0;

  return (
    <div className="flex items-center justify-center lg:justify-start">
      <BankCardPreview
        bankName={accountName}
        bankConfig={bankConfig}
        balance={formattedBalance}
        accountType={accountType}
        isVisible={showCard}
        userName={userName}
        currency={currency}
      />
    </div>
  );
}
