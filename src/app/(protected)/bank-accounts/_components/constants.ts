import type { AccountFormValues } from "./types";

export const accountTypeLabels: Record<AccountFormValues["type"], string> = {
  checking: "Checking",
  investment: "Investment",
};

export const defaultFormValues: AccountFormValues = {
  name: "",
  type: "checking",
  initialBalance: 0,
  currency: "BRL",
  color: "#6366F1",
};
