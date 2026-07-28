import { createCore, type Core } from '@commun/core';

/**
 * Le Core câblé, en singleton PARESSEUX (revue PR #1, 28/07 — remplace
 * l'ancien plugin + hook `request` qui attachait le core à chaque event) :
 * les handlers appellent simplement `useCore()`. Premier appel = boot
 * (migrations fail-fast + ménage), suivants = même instance.
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
