import { createCore, type Core } from '@commun/core';

/**
 * The wired Core, as a singleton. `plugins/core.ts` makes the first call at
 * server start, so migrations and housekeeping run at boot rather than on the
 * first request.
 */
let core: Core | undefined;

export function useCore(): Core {
  if (!core) {
    core = createCore();
    // Boot housekeeping: SQLite has no TTL indexes (unlike the legacy Mongo).
    void core.services.users.purgeExpired();
  }
  return core;
}
