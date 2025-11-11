import { accountsRouter } from "./routers/accounts";
import { categoriesRouter } from "./routers/categories";
import { financialGroupsRouter } from "./routers/financialGroups";
import { transactionsRouter } from "./routers/transactions";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  accounts: accountsRouter,
  categories: categoriesRouter,
  financialGroups: financialGroupsRouter,
  transactions: transactionsRouter,
});

export type AppRouter = typeof appRouter;
