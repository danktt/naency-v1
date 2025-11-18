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

// Helper function to generate gradient from color
export const getGradientFromColor = (color: string) => {
  // Convert hex to RGB
  const hex = color.replace("#", "");
  const r = Number.parseInt(hex.substring(0, 2), 16);
  const g = Number.parseInt(hex.substring(2, 4), 16);
  const b = Number.parseInt(hex.substring(4, 6), 16);

  // Create a darker variant for gradient
  const darkerR = Math.max(0, r - 40);
  const darkerG = Math.max(0, g - 40);
  const darkerB = Math.max(0, b - 40);

  return `linear-gradient(135deg, ${color} 0%, rgb(${darkerR}, ${darkerG}, ${darkerB}) 100%)`;
};

// Format account number for display
export const formatAccountNumber = (id: string) => {
  // Use last 4 characters of ID as account number
  const last4 = id.slice(-4).padStart(4, "0");
  return `**** **** **** ${last4}`;
};

