import { defineMiddleware } from 'h3';
import { useCore } from '../utils/core.ts';

/**
 * Session resolution. Middlewares are numbered because order matters.
 *
 * Auth travels as a Bearer token, never a cookie, and is verified against the
 * database on every request. Handlers read `event.context.session`.
 */
function readSessionToken(req: Request): string | null {
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice('Bearer '.length);
  // API tokens (commun_ prefix) belong to the content plane, not to sessions.
  return token.startsWith('commun_') ? null : token;
}

export default defineMiddleware(async (event) => {
  const token = readSessionToken(event.req as unknown as Request);
  event.context.session = token ? await useCore().services.users.verifySession(token) : null;
});
