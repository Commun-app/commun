// The tRPC API composer. It sits above the domains (it imports their sub-router
// façades) and the transverse health router, so it lives at the top level — not
// in `infrastructure/` (which never imports domains). `index.ts` re-exports it.
import { router, healthRouter } from './infrastructure/trpc/index.ts';
import { collectiviteRouter } from './domains/collectivite/index.ts';
import { authRouter, usersRouter, apiTokensRouter } from './domains/users/index.ts';
import { actualitesRouter } from './domains/actualites/index.ts';
import { agendaRouter } from './domains/agenda/index.ts';
import { elusRouter } from './domains/elus/index.ts';
import { projetsRouter } from './domains/projets/index.ts';
import { deliberationsRouter } from './domains/deliberations/index.ts';
import { formulairesRouter } from './domains/formulaires/index.ts';
import { mediasRouter } from './domains/medias/index.ts';
import { collectionsRouter } from './domains/collections/index.ts';

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  users: usersRouter,
  apiTokens: apiTokensRouter,
  collectivite: collectiviteRouter,
  actualites: actualitesRouter,
  agenda: agendaRouter,
  elus: elusRouter,
  projets: projetsRouter,
  deliberations: deliberationsRouter,
  formulaires: formulairesRouter,
  medias: mediasRouter,
  collections: collectionsRouter,
});

export type AppRouter = typeof appRouter;
