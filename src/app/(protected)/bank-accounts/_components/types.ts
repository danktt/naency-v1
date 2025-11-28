import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/api/root";
import { z } from "zod";

// === BANK ACCOUNTS ===
export const accountSchema = z.object({
  name: z.string().trim().min(1, "Please provide an account name."),
  type: z.enum(["checking", "investment"]),
  initialBalance: z
    .number()
    .int()
    .min(0, "Initial balance cannot be negative."),
  currency: z.enum(["BRL", "USD"]),
  color: z.string().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, "Pick a valid color."),
});

export type AccountFormValues = z.infer<typeof accountSchema>;

type RouterOutput = inferRouterOutputs<AppRouter>;
export type BankAccount = RouterOutput["bankAccounts"]["list"][number];
