import { defineHandler, readBody } from 'h3';

/**
 * Authentification DÉLÉGUÉE, SANS annuaire (décision Quentin 03/08).
 *
 * Le portail présente les identifiants à TOUTES les instances qu'il connaît,
 * en parallèle et côté serveur, puis route vers celle qui les accepte.
 *
 * Pourquoi pas un mapping email → instance, comme prévu initialement : un
 * annuaire est une PHOTOGRAPHIE. Un rédacteur invité à 10h dans l'admin d'une
 * commune se verrait répondre « identifiants invalides » jusqu'à la
 * régénération suivante — un compte parfaitement valide, refusé sans que rien
 * ne l'explique. Le rafraîchir demandait soit un cron (fenêtre d'échec
 * inexplicable), soit un webhook par instance (couplage et mode de panne
 * supplémentaires). Interroger les instances supprime le problème : la vérité
 * reste là où elle est produite.
 *
 * Un compte présent sur plusieurs instances — les comptes internes — obtient
 * la liste et choisit, au lieu d'être routé arbitrairement.
 *
 * TEMPORAIRE : la diffusion tient pour quatre clients, pas pour quarante.
 * Elle disparaît avec le connecteur OIDC de la phase 6, où le fournisseur
 * d'identité rend le routage inutile.
 */
interface Instance {
  slug: string;
  url: string;
}

const INVALID = { error: 'Identifiants invalides' } as const;
const UNAVAILABLE = {
  error: 'Service momentanément indisponible, réessayez dans un instant',
} as const;
const LOGIN_TIMEOUT_MS = 10_000;

// Fenêtre glissante PAR COMPTE : une tentative de connexion en devient autant
// qu'il y a d'instances, et le portail amplifierait sinon une attaque par
// force brute.
//
// Le plafond par ADRESSE a été retiré (décision Quentin 04/08) : il vit
// désormais dans Traefik, attaché au routeur du portail. Le proxy est le bon
// endroit pour cela — il voit toutes les requêtes, pas seulement celles qui
// atteignent cette route. Il ne peut en revanche pas lire le corps, donc il
// ignore quel COMPTE est visé : c'est ce que fait ce compteur, et lui seul.
const RATE_WINDOW_MS = 5 * 60_000;
const RATE_MAX_PER_EMAIL = 10;
const attempts = new Map<string, number[]>();

function rateLimited(email: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(email) ?? []).filter((at) => now - at < RATE_WINDOW_MS);
  recent.push(now);
  attempts.set(email, recent);
  return recent.length > RATE_MAX_PER_EMAIL;
}

/** `PORTAL_INSTANCES` : {"grigny":"https://grigny.…", …} */
function instances(): Instance[] {
  try {
    const parsed = JSON.parse(process.env.PORTAL_INSTANCES ?? '{}') as Record<string, string>;
    return Object.entries(parsed).map(([slug, url]) => ({ slug, url }));
  } catch {
    return [];
  }
}

/**
 * Tente une connexion sur UNE instance. Ne jette jamais : une instance
 * injoignable ne doit pas empêcher les autres de répondre.
 */
async function login(instance: Instance, email: string, password: string): Promise<string | null> {
  try {
    const response = await fetch(`${instance.url}/api/trpc/auth.login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(LOGIN_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { result?: { data?: { token?: string } } };
    return payload.result?.data?.token ?? null;
  } catch {
    return null;
  }
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

  const normalized = email.trim().toLowerCase();
  if (rateLimited(normalized)) {
    event.res.status = 429;
    return { error: 'Trop de tentatives, réessayez dans quelques minutes' };
  }

  const known = instances();
  if (known.length === 0) {
    event.res.status = 503;
    return UNAVAILABLE;
  }

  const results = await Promise.all(
    known.map(async (instance) => ({
      instance,
      token: await login(instance, normalized, password),
    })),
  );

  // La remise de session se fait en FRAGMENT : le jeton n'atteint ni le
  // serveur de destination ni les journaux — c'est la forme du flux implicite
  // d'OAuth, et la route qui le reçoit est un point de rappel générique, pas
  // une porte réservée au cloud.
  const granted = results
    .filter((r): r is { instance: Instance; token: string } => r.token !== null)
    .map(({ instance, token }) => ({
      slug: instance.slug,
      url: `${instance.url}/auth/callback#token=${encodeURIComponent(token)}`,
    }));

  if (granted.length === 0) {
    event.res.status = 401;
    return INVALID;
  }
  // Un seul accès : on y va directement, l'utilisateur ne voit aucun choix.
  if (granted.length === 1) return { url: granted[0]!.url };
  return { choices: granted };
});
