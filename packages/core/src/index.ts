// @commun/core — public entrypoint + IoC root.
//
// `createCore({ env })` is the single composition root: it instantiates the
// infrastructure adapters and returns the wired `Core`. It is the ONLY place
// concrete adapters are chosen.

import type { Core, CoreEnv } from './common/types/index.ts';
import { parseEnv } from './common/env/index.ts';
import { assertProductionConfig } from './common/env/guards.ts';
import { instrument } from './common/observability/index.ts';
import { connectDb } from './infrastructure/db/index.ts';
import { HealthService } from './infrastructure/health/index.ts';

export function createCore({ env }: { env?: CoreEnv } = {}): Core {
  const e: CoreEnv = env ?? parseEnv();
  assertProductionConfig();

  const db = connectDb(e.COMMUN_DATA_DIR);
  const health = instrument(new HealthService(db), { layer: 'infra', component: 'health' });

  return { env: e, db, health };
}

export { parseEnv } from './common/env/index.ts';
export { assertProductionConfig } from './common/env/guards.ts';
export { connectDb, type StoreDb } from './infrastructure/db/index.ts';
export { HealthService, type HealthStatus } from './infrastructure/health/index.ts';
export { CommunError, ERR, type ErrorCode } from './common/errors/index.ts';
export type { Core, CoreContext, CoreEnv, Id, IsoTimestamp, SessionCookies } from './common/types/index.ts';
export { appRouter, type AppRouter } from './router.ts';

// Domains — schemas, validation, queries, routers.
export * from './domains/organization/index.ts';
export * from './domains/users/index.ts';
export * from './domains/media/index.ts';
export * from './domains/deliberations/index.ts';
export * from './domains/forms/index.ts';
export * from './domains/collections/index.ts';
