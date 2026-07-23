import {
  defineMiddleware,
  isPreflightRequest,
  appendCorsHeaders,
  appendCorsPreflightHeaders,
} from 'h3';

/**
 * CORS for the Commun API.
 *
 * Auth rides on an httpOnly cookie, and browsers refuse credentialed requests
 * when `Access-Control-Allow-Origin: *` — so the wildcard is NOT an option.
 * Production recommendation: serve the admin from the SAME origin as the API
 * (no CORS involved at all). For split-origin setups and local dev, allowed
 * origins come from COMMUN_ALLOWED_ORIGINS (comma-separated); the middleware
 * reflects the origin ONLY when allowlisted, with credentials enabled.
 */
const DEV_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const allowedOrigins = new Set(
  (process.env.COMMUN_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .concat(process.env.NODE_ENV === 'production' ? [] : DEV_ORIGINS),
);

export default defineMiddleware((event) => {
  const origin = event.req.headers.get('origin');
  // Same-origin requests (or non-browser clients) send no Origin — nothing to do.
  if (!origin || !allowedOrigins.has(origin)) return undefined;

  const cors = {
    origin: [origin],
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
    exposeHeaders: ['Content-Type'],
    maxAge: '600',
  };

  if (isPreflightRequest(event)) {
    appendCorsPreflightHeaders(event, cors);
    return new Response(null, { status: 204 });
  }
  appendCorsHeaders(event, cors);
  return undefined;
});
