import { accountsRouter } from "./routers/accounts";
import { categoriesRouter } from "./routers/categories";
import { financialGroupsRouter } from "./routers/financialGroups";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  accounts: accountsRouter,
  categories: categoriesRouter,
  financialGroups: financialGroupsRouter,
});

export type AppRouter = typeof appRouter;
