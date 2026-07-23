import { HTTPError } from 'h3';
import {
  createCore,
  parseEnv,
  verifySession,
  type Core,
  type CoreContext,
  type SessionCookies,
} from '@commun/core';

/**
 * API-wide service singletons. `useCore()` boots the wired Core exactly once —
 * lazily, so that `nitro prepare` and other CLI commands that import this
 * module don't side-effect a database creation. The request CONTEXT, however,
 * is built per request: it carries the caller's session.
 */
let cachedCore: Core | null = null;

export const useCore = (): Core => {
  if (!cachedCore) cachedCore = createCore({ env: parseEnv() });
  return cachedCore;
};

const COOKIE_NAME = 'commun_session';

export function readSessionToken(req: Request): string | null {
  const cookie = req.headers.get('cookie') ?? '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match?.[1] ?? null;
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

/** Per-request tRPC context: resolves the session from the cookie. */
export function createRequestContext(req: Request, resHeaders: Headers): CoreContext {
  const core = useCore();
  const token = readSessionToken(req);
  const session = token ? verifySession(core.db, token) : null;
  return {
    db: core.db,
    health: core.health,
    storage: core.storage,
    session,
    cookies: makeCookies(resHeaders),
  };
}

/** Session guard for REST routes (media upload) — throws 401 without a valid session. */
export function requireSession(req: Request) {
  const core = useCore();
  const token = readSessionToken(req);
  const session = token ? verifySession(core.db, token) : null;
  if (!session) throw new HTTPError({ status: 401, message: 'session requise' });
  return session;
}
