import { randomUUID } from 'node:crypto';
import { defineMiddleware } from 'h3';

/**
 * Passe sécurité transverse (9.12) — premier middleware de la chaîne :
 * - X-Request-Id : corrélation des logs (généré si absent, renvoyé au client)
 * - en-têtes de sécurité de base (l'API sert du JSON + l'admin statique)
 * (Rate limiting retiré — décision Quentin 27/07 : à traiter au niveau du
 * reverse proxy de l'instance si besoin, pas dans l'application.)
 */
export default defineMiddleware((event) => {
  // ── Corrélation ────────────────────────────────────────────────────────────
  const requestId = event.req.headers.get('x-request-id') ?? randomUUID();
  event.res.headers.set('x-request-id', requestId);

  // ── En-têtes de sécurité ───────────────────────────────────────────────────
  event.res.headers.set('x-content-type-options', 'nosniff');
  event.res.headers.set('x-frame-options', 'DENY');
  event.res.headers.set('referrer-policy', 'no-referrer');
  // HSTS seulement derrière TLS (reverse proxy) — jamais en dev http.
  if (event.req.headers.get('x-forwarded-proto') === 'https') {
    event.res.headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains');
  }
});
