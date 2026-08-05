// @commun/core — public entrypoint and composition root.
//
// `createCore({ env })` is the ONLY place concrete implementations are chosen.
// Layering: trpc/REST → services → repositories → Drizzle.
//
// Two consumption surfaces: `appRouter` (tRPC) for the admin plane, `services`
// for the REST plane, scheduled tasks and tooling — same logic, no transport.

import type { Core, CoreEnv } from './common/types/index.ts';
import { parseEnv } from './common/env/index.ts';
import { connectDb } from './infrastructure/db/index.ts';
import { EmailService } from './infrastructure/email/index.ts';
import { HealthService } from './infrastructure/health/index.ts';
import { createStorage } from './infrastructure/storage/index.ts';
import { healthRouter, router } from './infrastructure/trpc/index.ts';
import { UsersRepository, UsersService } from './domains/users/index.ts';
import { OrganizationRepository, OrganizationService } from './domains/organization/index.ts';
import { MediaRepository, MediaService } from './domains/media/index.ts';
import { CollectionsRepository, CollectionsService } from './domains/collections/index.ts';
import { organizationRouter } from './domains/organization/index.ts';
import { authRouter, usersRouter, apiTokensRouter } from './domains/users/index.ts';
import { mediaRouter } from './domains/media/index.ts';
import { collectionsRouter } from './domains/collections/index.ts';

export function createCore({ env }: { env?: CoreEnv } = {}): Core {
  const e: CoreEnv = env ?? parseEnv();

  const db = connectDb(e.COMMUN_DATA_DIR, e.COMMUN_MIGRATIONS_DIR);
  // Fail-fast (revue 28/07) : S3 et webhook email sont REQUIS — une instance
  // mal configurée refuse de démarrer plutôt que d'échouer à l'usage.
  const storage = createStorage(e);
  const email = EmailService.fromEnv(e);

  const users = new UsersService(new UsersRepository(db), {
    email,
    adminUrl: e.COMMUN_ADMIN_URL,
    jwtSecret: e.COMMUN_JWT_SECRET,
  });
  const mediaRepository = new MediaRepository(db);
  const media = new MediaService(mediaRepository, storage);
  const collectionsRepository = new CollectionsRepository(db);
  const collections = new CollectionsService(collectionsRepository, media);
  const organization = new OrganizationService(new OrganizationRepository(db));
  const services = {
    health: new HealthService(db),
    users,
    organization,
    media,
    collections,
  };

  // No side effects here (review): boot housekeeping (purgeExpired) is the
  // API's job — see apps/api/server/plugins/core.ts.
  return { env: e, db, storage, services };
}

// ── tRPC API composer (ex-router.ts, fusionné ici — revue PR #1) ─────────────

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  users: usersRouter,
  apiTokens: apiTokensRouter,
  organization: organizationRouter,
  media: mediaRouter,
  collections: collectionsRouter,
});

export type AppRouter = typeof appRouter;

// ── Public exports ───────────────────────────────────────────────────────────

export { parseEnv } from './common/env/index.ts';
export { connectDb, type StoreDb } from './infrastructure/db/index.ts';
export {
  createStorage,
  S3Storage,
  type StorageDriver,
  type S3Config,
} from './infrastructure/storage/index.ts';
export { HealthService, type HealthStatus } from './infrastructure/health/index.ts';
export { EmailService, type EmailEvent } from './infrastructure/email/index.ts';
export {
  createTypedError,
  DomainError,
  type TrpcErrorCode,
} from './common/errors/index.ts';
export type {
  Core,
  CoreContext,
  CoreEnv,
  CoreServices,
  Id,
  IsoTimestamp,
} from './common/types/index.ts';

// Domains — schemas, validation, repositories, services, routers, errors.
// (La sync APIDAE vit dans @commun/apidae-sync — frontière volontaire, review PR #4.)
export * from './domains/organization/index.ts';
export * from './domains/users/index.ts';
export * from './domains/media/index.ts';
export * from './domains/collections/index.ts';
