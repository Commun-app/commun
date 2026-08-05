import { defineMiddleware, handleCors } from 'h3';

/**
 * Any origin is allowed: auth is a Bearer header, never a cookie, so a browser
 * never attaches credentials on its own.
 *
 * The origin is REFLECTED rather than wildcarded — browsers reject
 * `Access-Control-Allow-Origin: *` on credentialed requests, and nuxt-auth
 * sends `credentials: 'include'`.
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
