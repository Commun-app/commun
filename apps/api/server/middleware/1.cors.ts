import { defineMiddleware, handleCors } from 'h3';

/**
 * CORS — iso legacy (the gateway allowed any origin). Safe here because auth
 * is a Bearer header (never auto-attached by browsers), not a cookie.
 */
export default defineMiddleware((event) => {
  const response = handleCors(event, {
    origin: '*',
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
