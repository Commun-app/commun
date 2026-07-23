import type { Core, CoreContext } from '@commun/core';

/**
 * Request helpers of the API. The Core itself is booted by
 * `server/plugins/core.ts` and reaches handlers via `event.context.core`.
 *
 * Auth transport is iso legacy: an opaque session token in
 * `Authorization: Bearer <token>` — no cookies. (The legacy carried a JWT the
 * same way, but verified the Session in DB on every request anyway; the
 * opaque token keeps that exact behaviour without the signed wrapper.)
 */
export function readSessionToken(req: Request): string | null {
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice('Bearer '.length);
  // API tokens (commun_ prefix) belong to the content plane, not to sessions.
  return token.startsWith('commun_') ? null : token;
}

/** Per-request tRPC context: resolves the session from the Bearer header. */
export async function createRequestContext(core: Core, req: Request): Promise<CoreContext> {
  const token = readSessionToken(req);
  const session = token ? await core.services.users.verifySession(token) : null;
  return { services: core.services, session };
}
