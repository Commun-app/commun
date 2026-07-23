import { createCore, parseEnv, type Core, type CoreContext } from '@commun/core';

/**
 * API-wide singletons. `useCore()` boots the wired Core exactly once — lazily,
 * so that `nitro prepare` and other CLI commands that import this module don't
 * side-effect a database creation. The request CONTEXT is built per request.
 *
 * Auth transport is iso legacy: an opaque session token in
 * `Authorization: Bearer <token>` — no cookies. (The legacy carried a JWT the
 * same way, but verified the Session in DB on every request anyway; the
 * opaque token keeps that exact behaviour without the signed wrapper.)
 */
let cachedCore: Core | null = null;

export const useCore = (): Core => {
  if (!cachedCore) cachedCore = createCore({ env: parseEnv() });
  return cachedCore;
};

export function readSessionToken(req: Request): string | null {
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice('Bearer '.length);
  // API tokens (commun_ prefix) belong to the content plane, not to sessions.
  return token.startsWith('commun_') ? null : token;
}

/** Per-request tRPC context: resolves the session from the Bearer header. */
export function createRequestContext(req: Request): CoreContext {
  const core = useCore();
  const token = readSessionToken(req);
  const session = token ? core.services.users.verifySession(token) : null;
  return { services: core.services, session };
}
