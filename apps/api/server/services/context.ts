import { HTTPError } from 'h3';
import { createCore, parseEnv, type Core, type CoreContext, type SessionCookies } from '@commun/core';

/**
 * API-wide singletons. `useCore()` boots the wired Core exactly once — lazily,
 * so that `nitro prepare` and other CLI commands that import this module don't
 * side-effect a database creation. The request CONTEXT, however, is built per
 * request: it carries the caller's session.
 *
 * NOTE auth transport: the legacy platform used `Authorization: Bearer <JWT>`.
 * Commun replaces JWT with opaque server-side sessions (design D7) carried by
 * an httpOnly cookie for browsers, AND accepts the same session token as a
 * Bearer header for non-browser clients (curl, scripts) — capability parity
 * without the JWT pitfalls.
 */
let cachedCore: Core | null = null;

export const useCore = (): Core => {
  if (!cachedCore) cachedCore = createCore({ env: parseEnv() });
  return cachedCore;
};

const COOKIE_NAME = 'commun_session';

export function readSessionToken(req: Request): string | null {
  const cookie = req.headers.get('cookie') ?? '';
  const fromCookie = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`))?.[1];
  if (fromCookie) return fromCookie;
  const auth = req.headers.get('authorization') ?? '';
  // API tokens (commun_ prefix) belong to the content plane, not to sessions.
  if (auth.startsWith('Bearer ') && !auth.startsWith('Bearer commun_')) {
    return auth.slice('Bearer '.length);
  }
  return null;
}

/** h3/fetch adapter for the transport-agnostic cookie surface of CoreContext. */
function makeCookies(resHeaders: Headers): SessionCookies {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const base = `Path=/; HttpOnly; SameSite=Lax`;
  return {
    set: (token, expiresAt) =>
      resHeaders.append(
        'set-cookie',
        `${COOKIE_NAME}=${token}; ${base}; Expires=${new Date(expiresAt).toUTCString()}${secure}`,
      ),
    clear: () => resHeaders.append('set-cookie', `${COOKIE_NAME}=; ${base}; Max-Age=0${secure}`),
  };
}

/** Per-request tRPC context: resolves the session from cookie or Bearer header. */
export function createRequestContext(req: Request, resHeaders: Headers): CoreContext {
  const core = useCore();
  const token = readSessionToken(req);
  const session = token ? core.services.users.verifySession(token) : null;
  return { services: core.services, session, cookies: makeCookies(resHeaders) };
}

/** Session guard for REST routes (media upload) — throws 401 without a valid session. */
export function requireSession(req: Request) {
  const core = useCore();
  const token = readSessionToken(req);
  const session = token ? core.services.users.verifySession(token) : null;
  if (!session) throw new HTTPError({ status: 401, message: 'session requise' });
  return session;
}
