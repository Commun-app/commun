import { readFileSync } from 'node:fs';
import { defineHandler, readBody } from 'h3';

/**
 * Authentification DÉLÉGUÉE (spec auth-portal) : le portail route l'email
 * vers son instance (mapping généré depuis les bases migrées), appelle
 * `auth.login` de l'instance côté serveur et renvoie l'URL de remise de
 * session (`/sso#token=…` — fragment : jamais dans les logs). Le portail ne
 * stocke NI mot de passe NI session ; un email inconnu reçoit le même
 * message qu'un mot de passe invalide (pas d'énumération de comptes).
 *
 * Mapping (PORTAL_MAP, défaut ./portal-map.json) :
 *   { "instances": { "<slug>": "https://…" }, "emails": { "<email>": "<slug>" } }
 */
interface PortalMap {
  instances: Record<string, string>;
  emails: Record<string, string>;
}

const INVALID = { error: 'Identifiants invalides' } as const;
const LOGIN_TIMEOUT_MS = 10_000;

let map: PortalMap | undefined;
function portalMap(): PortalMap {
  map ??= JSON.parse(
    readFileSync(process.env.PORTAL_MAP ?? './portal-map.json', 'utf8'),
  ) as PortalMap;
  return map;
}

export default defineHandler(async (event) => {
  const { email, password } = ((await readBody(event)) ?? {}) as {
    email?: string;
    password?: string;
  };
  if (!email || !password) {
    event.res.status = 400;
    return INVALID;
  }

  const { instances, emails } = portalMap();
  const instance = instances[emails[email.trim().toLowerCase()] ?? ''];
  if (!instance) {
    event.res.status = 401;
    return INVALID;
  }

  let response: Response;
  try {
    response = await fetch(`${instance}/api/trpc/auth.login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(LOGIN_TIMEOUT_MS),
    });
  } catch {
    event.res.status = 503;
    return { error: 'Service momentanément indisponible, réessayez dans un instant' };
  }

  if (!response.ok) {
    event.res.status = 401;
    return INVALID;
  }
  const payload = (await response.json()) as { result?: { data?: { token?: string } } };
  const token = payload.result?.data?.token;
  if (!token) {
    event.res.status = 401;
    return INVALID;
  }

  // La redirection est faite CÔTÉ CLIENT (location.assign) : le token ne
  // transite jamais dans un header Location journalisable.
  return { url: `${instance}/sso#token=${encodeURIComponent(token)}` };
});
