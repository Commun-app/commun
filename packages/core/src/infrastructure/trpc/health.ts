import { router, procedure } from './trpc.ts';

// Health is a transverse sub-router with no owning domain — it lives with the
// tRPC plumbing. It is thin transport over the HealthService
// (infrastructure/health), which gathers core + downstream (OpenCode) connectivity.
export const healthRouter = router({
  ping: procedure.query(({ ctx }) => ctx.health.check()),
});
