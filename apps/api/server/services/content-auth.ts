import { HTTPError } from 'h3';
import { useCore } from './context.ts';

/**
 * API-token guard of the public content plane (spec api-server). Accepts
 * `Authorization: Bearer <token>` AND the raw `Authorization: <token>` form
 * the legacy device clients (current site builds) send.
 */
export function requireApiToken(req: Request): void {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : auth;
  if (!token || !useCore().services.users.verifyApiToken(token)) {
    throw new HTTPError({ status: 401, message: 'token API manquant ou invalide' });
  }
}
