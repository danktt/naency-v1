import { accountsRouter } from "./routers/accounts";
import { categoriesRouter } from "./routers/categories";
import { financialGroupsRouter } from "./routers/financialGroups";
import { provisionsRouter } from "./routers/provisions";
import { transactionsRouter } from "./routers/transactions";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  accounts: accountsRouter,
  bankAccounts: accountsRouter,
  categories: categoriesRouter,
  financialGroups: financialGroupsRouter,
  transactions: transactionsRouter,
  provisions: provisionsRouter,
});

export type AppRouter = typeof appRouter;
