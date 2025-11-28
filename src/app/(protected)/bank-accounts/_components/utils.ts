import type { AccountFormValues } from "./types";

export const parseInitialBalance = (
  value: string | number | null | undefined,
) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// Format account number for display
export const formatAccountNumber = (id: string) => {
  // Use last 4 characters of ID as account number
  const last4 = id.slice(-4).padStart(4, "0");
  return `**** **** **** ${last4}`;
};
