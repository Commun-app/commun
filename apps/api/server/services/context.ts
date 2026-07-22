import { createCore, parseEnv, type Core, type CoreContext } from '@commun/core';

/**
 * API-wide service singletons. `useCore()` boots the wired Core exactly once —
 * lazily, so that `nitro prepare` and other CLI commands that import this
 * module don't side-effect a database creation. The tRPC layer sees only the
 * narrower `CoreContext`.
 */
let cachedCore: Core | null = null;

export const useCore = (): Core => {
  if (!cachedCore) cachedCore = createCore({ env: parseEnv() });
  return cachedCore;
};

let cachedContext: CoreContext | null = null;

export const createContext = async (): Promise<CoreContext> => {
  if (cachedContext) return cachedContext;
  const core = useCore();
  cachedContext = {
    db: core.db,
    health: core.health,
  };
  return cachedContext;
};

export type ApiContext = CoreContext;
