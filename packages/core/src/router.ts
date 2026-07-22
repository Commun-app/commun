// The tRPC API composer. It sits above the domains (it imports their sub-router
// façades) and the transverse health router, so it lives at the top level — not
// in `infrastructure/` (which never imports domains). `index.ts` re-exports it.
import { router, healthRouter } from './infrastructure/trpc/index.ts';
import { actualitesRouter } from './domains/actualites/index.ts';

export const appRouter = router({
  health: healthRouter,
  actualites: actualitesRouter,
});

export type AppRouter = typeof appRouter;
