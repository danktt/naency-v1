import type { AccountFormValues, CreditCardFormValues } from "./types";

export const accountTypeLabels: Record<
  AccountFormValues["type"],
  string
> = {
  checking: "Checking",
  credit: "Credit",
  investment: "Investment",
};

export const defaultFormValues: AccountFormValues = {
  name: "",
  type: "checking",
  initialBalance: 0, // in cents
  currency: "BRL",
  color: "#6366F1",
};

export const defaultCreditCardFormValues: CreditCardFormValues = {
  name: "",
  brand: "",
  creditLimit: 0,
  currency: "BRL",
};
