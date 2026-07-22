// The tRPC API composer. It sits above the domains (it imports their sub-router
// façades) and the transverse health router, so it lives at the top level — not
// in `infrastructure/` (which never imports domains). `index.ts` re-exports it.
import { router, healthRouter } from './infrastructure/trpc/index.ts';
import { organizationRouter } from './domains/organization/index.ts';
import { authRouter, usersRouter, apiTokensRouter } from './domains/users/index.ts';
import { deliberationsRouter } from './domains/deliberations/index.ts';
import { formsRouter } from './domains/forms/index.ts';
import { mediaRouter } from './domains/media/index.ts';
import { collectionsRouter } from './domains/collections/index.ts';

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  users: usersRouter,
  apiTokens: apiTokensRouter,
  organization: organizationRouter,
  deliberations: deliberationsRouter,
  forms: formsRouter,
  media: mediaRouter,
  collections: collectionsRouter,
});

export type AppRouter = typeof appRouter;
