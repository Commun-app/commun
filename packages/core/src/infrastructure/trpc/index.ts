// tRPC delivery plumbing — the shared builders, middlewares, and the
// transverse health router. Domain sub-routers import the builders from here;
// `src/index.ts` composes them into the `appRouter`.
export {
  t,
  router,
  procedure,
  protectedProcedure,
  adminProcedure,
  publicProcedure,
  middleware,
  errorMapper,
} from './trpc.ts';
export { healthRouter } from './health.ts';
export type { CoreContext } from '../../common/types/core.ts';
