import { defineMiddleware, HTTPError } from 'h3';
import { useCore } from '../utils/core.ts';

/**
 * API-token guard of the public content plane (numbered middleware — order matters,
 * it must run after 2.session). Guards exactly the
 * token-protected legacy-compat routes; the wordpress route is public (iso
 * legacy) and the tRPC plane carries its own session auth. Accepts
 * `Authorization: Bearer <token>` AND the raw `Authorization: <token>` form
 * the legacy device clients (current site builds) send.
 */
const GUARDED_PATHS = new Set(['/api/v1/content/records', '/api/v1/content/deployment']);

export default defineMiddleware(async (event) => {
  if (!GUARDED_PATHS.has(event.url.pathname)) return;

  const auth = event.req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : auth;
  if (!token || !(await useCore().services.users.verifyApiToken(token))) {
    throw new HTTPError({ status: 401, message: 'token API manquant ou invalide' });
  }
});
