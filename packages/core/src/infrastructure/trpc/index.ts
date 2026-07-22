// tRPC delivery plumbing — the shared builders, middlewares, and the transverse
// health router. Domain sub-routers import `router`/`procedure` from here; the
// top-level `src/router.ts` composes them into the `appRouter`.
export {
  t,
  router,
  procedure,
  publicProcedure,
  middleware,
  correlation,
  errorMapper,
} from './trpc.ts';
export { healthRouter } from './health.ts';
export type { CoreContext } from './context.ts';
