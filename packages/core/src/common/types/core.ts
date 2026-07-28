import type { CoreEnv } from '../env/index.ts';
import type { HealthService } from '../../infrastructure/health/index.ts';
import type { StoreDb } from '../../infrastructure/db/index.ts';
import type { StorageDriver } from '../../infrastructure/storage/index.ts';
import type { AuthSession, SessionMeta, UsersService } from '../../domains/users/service.ts';
import type { OrganizationService } from '../../domains/organization/service.ts';
import type { MediaService } from '../../domains/media/service.ts';
import type { CollectionsService } from '../../domains/collections/service.ts';
import type { SyncService } from '../../sync/service.ts';

export type { CoreEnv };

/** The domain services — the ONLY surface transport layers (tRPC, REST) talk to. */
export interface CoreServices {
  health: HealthService;
  users: UsersService;
  organization: OrganizationService;
  media: MediaService;
  collections: CollectionsService;
  sync: SyncService;
}

/**
 * The fully-wired dependency graph returned by `createCore({ env })`:
 * infrastructure (db, storage) + the service layer built on repositories.
 */
export interface Core {
  env: CoreEnv;
  db: StoreDb;
  storage: StorageDriver;
  services: CoreServices;
}

/**
 * The per-request context exposed to tRPC procedures. Auth is iso-legacy:
 * an opaque token carried in `Authorization: Bearer` — no cookies anywhere.
 */
export interface CoreContext {
  services: CoreServices;
  /** Authenticated session, or null for anonymous requests. */
  session: AuthSession | null;
  /** Device metadata of the request (captured at login, iso legacy). */
  requestMeta?: SessionMeta;
}
