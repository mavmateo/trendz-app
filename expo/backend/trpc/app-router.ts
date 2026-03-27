import { createTRPCRouter } from "./create-context";
import { newsRouter } from "./routes/news";

export const appRouter = createTRPCRouter({
  news: newsRouter,
});

export type AppRouter = typeof appRouter;
