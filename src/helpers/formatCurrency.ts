export const formatCurrency = (
  amount: string | number,
  currency: "BRL" | "USD" = "BRL",
) => {
  const numericAmount =
    typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(numericAmount))
    return currency === "USD" ? "$0.00" : "R$ 0,00";

  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "pt-BR", {
    style: "currency",
    currency,
  }).format(numericAmount);
};

export const formatCents = (cents: number, currency: "BRL" | "USD" = "BRL") =>
  new Intl.NumberFormat(currency === "USD" ? "en-US" : "pt-BR", {
    style: "currency",
    currency,
  }).format((cents || 0) / 100);
