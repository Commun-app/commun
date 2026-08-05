import { randomUUID } from 'node:crypto';
import { defineMiddleware } from 'h3';

/**
 * First middleware in the chain: correlation id and baseline security headers.
 * Rate limiting belongs to the reverse proxy, not here.
 */
export default defineMiddleware((event) => {
  const requestId = event.req.headers.get('x-request-id') ?? randomUUID();
  event.res.headers.set('x-request-id', requestId);

  event.res.headers.set('x-content-type-options', 'nosniff');
  event.res.headers.set('x-frame-options', 'DENY');
  event.res.headers.set('referrer-policy', 'no-referrer');
  // HSTS only behind TLS — never over plain http in dev.
  if (event.req.headers.get('x-forwarded-proto') === 'https') {
    event.res.headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains');
  }
});
