import { taskRouter } from "./routers/task";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  task: taskRouter,
});

export type AppRouter = typeof appRouter;

