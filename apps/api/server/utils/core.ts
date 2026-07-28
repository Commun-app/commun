import { createCore, type Core } from '@commun/core';

/**
 * Le Core câblé, en singleton (revue PR #1, 28/07 — remplace l'ancien hook
 * `request` qui attachait le core à chaque event) : les handlers appellent
 * simplement `useCore()`. Le plugin `plugins/core.ts` fait le premier appel
 * au démarrage du serveur — migrations fail-fast + ménage jouent au boot,
 * pas au premier appel HTTP/tRPC.
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
