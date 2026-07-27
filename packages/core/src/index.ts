// @commun/core — public entrypoint + IoC root.
//
// `createCore({ env })` is the single composition root: it instantiates the
// infrastructure adapters, the repositories and the services, and returns the
// wired `Core`. It is the ONLY place concrete implementations are chosen.
// Layering: trpc/REST → services → repositories → Drizzle.

import type { Core, CoreEnv } from './common/types/index.ts';
import { parseEnv } from './common/env/index.ts';
import { connectDb } from './infrastructure/db/index.ts';
import { createEmail } from './infrastructure/email/index.ts';
import { HealthService } from './infrastructure/health/index.ts';
import { createStorage } from './infrastructure/storage/index.ts';
import { UsersRepository, UsersService } from './domains/users/index.ts';
import { OrganizationRepository, OrganizationService } from './domains/organization/index.ts';
import { MediaRepository, MediaService } from './domains/media/index.ts';
import { CollectionsRepository, CollectionsService } from './domains/collections/index.ts';

export function createCore({ env }: { env?: CoreEnv } = {}): Core {
  const e: CoreEnv = env ?? parseEnv();

  const db = connectDb(e.COMMUN_DATA_DIR, e.COMMUN_MIGRATIONS_DIR);
  const storage = createStorage(e);
  const email = createEmail(e);

  const users = new UsersService(new UsersRepository(db), {
    email,
    adminUrl: e.COMMUN_ADMIN_URL,
  });
  const media = new MediaService(new MediaRepository(db), storage);
  const services = {
    health: new HealthService(db),
    users,
    organization: new OrganizationService(new OrganizationRepository(db)),
    media,
    collections: new CollectionsService(new CollectionsRepository(db), media),
  };

  // No side effects here (review): boot housekeeping (purgeExpired) is the
  // API's job — see apps/api/server/plugins/core.ts.
  return { env: e, db, storage, services };
}

export { parseEnv } from './common/env/index.ts';
export { connectDb, type StoreDb } from './infrastructure/db/index.ts';
export {
  createStorage,
  createS3Storage,
  type StorageDriver,
  type S3Config,
} from './infrastructure/storage/index.ts';
export { HealthService, type HealthStatus } from './infrastructure/health/index.ts';
export { createEmail, type EmailDriver, type EmailMessage } from './infrastructure/email/index.ts';
export { CommunError, ERR, type ErrorCode } from './common/errors/index.ts';
export type {
  Core,
  CoreContext,
  CoreEnv,
  CoreServices,
  Id,
  IsoTimestamp,
} from './common/types/index.ts';
export { appRouter, type AppRouter } from './router.ts';

// Domains — schemas, validation, repositories, services, routers.
export * from './domains/organization/index.ts';
export * from './domains/users/index.ts';
export * from './domains/media/index.ts';
export * from './domains/collections/index.ts';
