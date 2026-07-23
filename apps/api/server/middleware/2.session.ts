import { defineMiddleware } from 'h3';

/**
 * Session resolution (middleware — numbered, order matters). Auth transport
 * is iso legacy: an opaque session token in `Authorization: Bearer <token>`,
 * no cookies. (The legacy carried a JWT the same way, but verified the
 * Session in DB on every request anyway; the opaque token keeps that exact
 * behaviour without the signed wrapper.) Downstream handlers — the tRPC
 * catch-all first — read `event.context.session`.
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
  event.context.session = token
    ? await event.context.core.services.users.verifySession(token)
    : null;
});
