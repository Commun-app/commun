import type { CoreEnv } from '../env/index.ts';
import type { HealthService } from '../../infrastructure/health/index.ts';
import type { StoreDb } from '../../infrastructure/db/index.ts';

export type { CoreEnv };

/**
 * The fully-wired dependency graph returned by `createCore({ env })`. Owns the
 * database handle and the infrastructure services; domain services are added
 * here as capabilities land (collectivite, actualites, deliberations, …).
 */
export interface Core {
  env: CoreEnv;
  db: StoreDb;
  health: HealthService;
}

/** The per-request context exposed to tRPC procedures. */
export interface CoreContext {
  db: StoreDb;
  health: HealthService;
}
