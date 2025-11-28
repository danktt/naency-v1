import { z } from "zod";

export const creditCardSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Card name is required"),
  brand: z.string().optional(),
  creditLimit: z.number().min(0, "Credit limit must be positive"),
  closingDay: z.number().min(1).max(31).optional().nullable(),
  dueDay: z.number().min(1).max(31).optional().nullable(),
  currency: z.enum(["BRL", "USD"]),
});

export type CreditCardFormValues = z.infer<typeof creditCardSchema>;

export type CreditCard = {
  id: string;
  name: string;
  brand: string | null;
  credit_limit: string;
  available_limit: string;
  closing_day: number | null;
  due_day: number | null;
  currency: "BRL" | "USD" | "EUR";
};
