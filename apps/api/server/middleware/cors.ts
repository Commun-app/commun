import { defineMiddleware, handleCors } from 'h3';
import { useCore } from '../services/context.ts';

/**
 * CORS — only needed when the admin is NOT served from the API's origin
 * (recommended setup: same origin, this middleware then never matches).
 * Allowed origins come from COMMUN_ALLOWED_ORIGINS; credentials are enabled
 * because auth rides on an httpOnly cookie (which rules out a `*` origin).
 */
export default defineMiddleware((event) => {
  const response = handleCors(event, {
    origin: useCore().env.COMMUN_ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-trpc-source', 'x-trpc-batch-mode', 'Accept', 'trpc-accept'],
    exposeHeaders: ['Content-Type'],
    maxAge: '600',
  });
  return response === false ? undefined : response;
});
