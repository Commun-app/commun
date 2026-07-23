import { HTTPError } from 'h3';
import { useCore } from './context.ts';

/** Bearer-token guard of the public content plane (spec api-server). */
export function requireApiToken(req: Request): void {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : '';
  if (!token || !useCore().services.users.verifyApiToken(token)) {
    throw new HTTPError({ status: 401, message: 'token API manquant ou invalide' });
  }
}
