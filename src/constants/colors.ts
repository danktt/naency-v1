export const expensesModeColors = {
  unique: {
    className: "text-text-negative",
    fill: "var(--color-text-negative)",
  },
  installment: {
    className: "text-text-installment",
    fill: "var(--color-text-installment)",
  },
  recurring: {
    className: "text-text-recurring",
    fill: "var(--color-text-recurring)",
  },
} as const;

export const incomesModeColors = {
  unique: {
    className: "text-text-positive",
    fill: "var(--color-text-positive)",
  },
  installment: {
    className: "text-text-installment",
    fill: "var(--color-text-installment)",
  },
  recurring: {
    className: "text-text-recurring",
    fill: "var(--color-text-recurring)",
  },
} as const;

export type ExpensesTransactionModeColorKey = keyof typeof expensesModeColors;
export type IncomesTransactionModeColorKey = keyof typeof incomesModeColors;
