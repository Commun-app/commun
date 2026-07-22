import type { CoreEnv } from '../env/index.ts';
import type { HealthService } from '../../infrastructure/health/index.ts';
import type { StoreDb } from '../../infrastructure/db/index.ts';
import type { AuthSession } from '../../domains/users/auth.ts';

export type { CoreEnv };

/**
 * The fully-wired dependency graph returned by `createCore({ env })`. Owns the
 * database handle and the infrastructure services; domain services are added
 * here as capabilities land (medias storage, site build, …).
 */
export interface Core {
  env: CoreEnv;
  db: StoreDb;
  health: HealthService;
}

/**
 * Transport-agnostic cookie surface provided by the API adapter — core code
 * never touches HTTP headers directly.
 */
export interface SessionCookies {
  set(token: string, expiresAt: string): void;
  clear(): void;
}

/** The per-request context exposed to tRPC procedures. */
export interface CoreContext {
  db: StoreDb;
  health: HealthService;
  /** Authenticated session, or null for anonymous requests. */
  session: AuthSession | null;
  cookies: SessionCookies;
}
