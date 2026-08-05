import { defineMiddleware, HTTPError } from 'h3';
import { useCore } from '../utils/core.ts';

/**
 * API-token guard of the public content plane; runs after `2.session`.
 *
 * Accepts both `Authorization: Bearer <token>` and the bare
 * `Authorization: <token>` form that existing site builds send.
 */
const GUARDED_PATHS = new Set(['/api/v1/content/records', '/api/v1/content/deployment']);

export default defineMiddleware(async (event) => {
  if (!GUARDED_PATHS.has(event.url.pathname)) return;

  const auth = event.req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : auth;
  if (!token || !(await useCore().services.users.verifyApiToken(token))) {
    throw new HTTPError({ status: 401, message: 'missing or invalid API token' });
  }
});
