export const formatCurrency = (amount: string) => {
  const numericAmount = parseFloat(amount);
  if (Number.isNaN(numericAmount)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numericAmount);
};

export const parseCurrencyToCents = (s: string) => {
  // pega só dígitos; "12,34" / "R$ 12,34" / "12.34" => "1234"
  const digits = s.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
};

export const formatCentsBRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    (cents || 0) / 100,
  );
