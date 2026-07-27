import { randomUUID } from 'node:crypto';
import { defineMiddleware, HTTPError } from 'h3';

/**
 * Passe sécurité transverse (9.12) — premier middleware de la chaîne :
 * - X-Request-Id : corrélation des logs (généré si absent, renvoyé au client)
 * - en-têtes de sécurité de base (l'API sert du JSON + l'admin statique)
 * - rate limiting en mémoire des endpoints d'authentification (anti brute
 *   force) — fenêtre glissante par IP, suffisant en single-tenant ; un
 *   limiteur distribué n'a pas de sens avec une instance par commune.
 */

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10; // par IP et par fenêtre, sur les routes sensibles

// Chemins tRPC sensibles : credentials ou jetons single-use en entrée.
const RATE_LIMITED = [
  '/api/trpc/auth.login',
  '/api/trpc/auth.acceptInvitation',
  '/api/trpc/auth.requestPasswordReset',
];

const attempts = new Map<string, number[]>();

function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  recent.push(now);
  attempts.set(key, recent);
  // Purge opportuniste : borne la mémoire sans timer dédié.
  if (attempts.size > 10_000) {
    for (const [k, list] of attempts) {
      if (list.every((at) => now - at >= WINDOW_MS)) attempts.delete(k);
    }
  }
  return recent.length > MAX_ATTEMPTS;
}

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

  // ── Rate limiting auth ─────────────────────────────────────────────────────
  if (event.req.method === 'POST' && RATE_LIMITED.includes(event.url.pathname)) {
    const ip =
      event.req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      event.context.clientAddress ||
      'unknown';
    if (tooManyAttempts(`${event.url.pathname}:${ip}`)) {
      throw new HTTPError({ status: 429, message: 'trop de tentatives, réessayez dans une minute' });
    }
  }
});
