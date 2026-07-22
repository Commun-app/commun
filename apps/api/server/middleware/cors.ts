import {
  defineMiddleware,
  isPreflightRequest,
  appendCorsHeaders,
  appendCorsPreflightHeaders,
} from 'h3';

/**
 * CORS for the Commun API.
 *
 * - On OPTIONS preflight: respond 204 with the CORS preflight headers and stop.
 * - On any other method: append CORS headers so the browser can read the body.
 *
 * Allowed origin is `*` for now: the admin app origin is not fixed yet. Before
 * production exposure, tighten this to the actual admin origin (e.g.
 * `https://admin.<organization>.fr`).
 */
const CORS = {
  origin: '*' as const,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'x-trpc-source',
    'x-trpc-batch-mode',
    'Accept',
    'trpc-accept',
  ],
  exposeHeaders: ['Content-Type'],
  maxAge: '600',
};

export default defineMiddleware((event) => {
  if (isPreflightRequest(event)) {
    appendCorsPreflightHeaders(event, CORS);
    return new Response(null, { status: 204 });
  }
  appendCorsHeaders(event, CORS);
  return undefined;
});
