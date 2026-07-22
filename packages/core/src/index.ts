// @commun/core — public entrypoint + IoC root.
//
// `createCore({ env })` is the single composition root: it instantiates the
// infrastructure adapters and returns the wired `Core`. It is the ONLY place
// concrete adapters are chosen. Domain services (collectivite, actualites,
// deliberations, …) are wired in here as their capabilities land.

import type { Core, CoreEnv } from './common/types/index.ts';
import { parseEnv } from './common/env/index.ts';
import { instrument } from './common/observability/index.ts';
import { connectDb } from './infrastructure/db/index.ts';
import { HealthService } from './infrastructure/health/index.ts';

export function createCore({ env }: { env?: CoreEnv } = {}): Core {
  const e: CoreEnv = env ?? parseEnv();

  const db = connectDb(e.COMMUN_DATA_DIR);
  const health = instrument(new HealthService(db), { layer: 'infra', component: 'health' });

  return { env: e, db, health };
}

export { parseEnv } from './common/env/index.ts';
export { connectDb, type StoreDb } from './infrastructure/db/index.ts';
export { HealthService, type HealthStatus } from './infrastructure/health/index.ts';
export { CommunError, ERR, type ErrorCode } from './common/errors/index.ts';
export type { Core, CoreContext, CoreEnv, Id, IsoTimestamp } from './common/types/index.ts';
export { appRouter, type AppRouter } from './router.ts';
