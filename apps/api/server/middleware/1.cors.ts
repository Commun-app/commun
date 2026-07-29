import { defineMiddleware, handleCors } from 'h3';

/**
 * CORS — iso legacy (the gateway allowed any origin). Safe here because auth
 * is a Bearer header (never auto-attached by browsers), not a cookie.
 *
 * Reflet d'origine + credentials, PAS de wildcard (upgrade-admin-nuxt4) :
 * nuxt-auth 1.x force `credentials: 'include'` sur ses fetches et les
 * navigateurs refusent `Access-Control-Allow-Origin: *` en mode credentialed.
 * La politique de fond est inchangée — toute origine, aucun cookie serveur,
 * le mode credentialed n'ouvre rien de plus.
 */
export default defineMiddleware((event) => {
  const response = handleCors(event, {
    origin: () => true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'x-trpc-source',
      'x-trpc-batch-mode',
      'Accept',
      'trpc-accept',
    ],
    maxAge: '600',
  });
  return response === false ? undefined : response;
});
