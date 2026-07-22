import { defineHandler } from 'nitro';
import { HTTPError } from 'h3';
import { listPublishedActualites, verifyApiToken } from '@commun/core';
import { useCore } from '../../../services/context.ts';

/**
 * Public content plane — consumed by the static site build. Bearer-token
 * authenticated (API tokens are stored hashed, revocable). Returns only
 * published content (scheduled publication respected).
 */
export default defineHandler((event) => {
  const core = useCore();
  const auth = event.req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : '';
  if (!token || !verifyApiToken(core.db, token)) {
    throw new HTTPError({ status: 401, message: 'token API manquant ou invalide' });
  }
  return { actualites: listPublishedActualites(core.db) };
});
