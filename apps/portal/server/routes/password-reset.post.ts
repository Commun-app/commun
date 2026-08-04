import { defineHandler, readBody } from 'h3';
import { type Instance, instances } from '../utils/instances.ts';
import { createEmailThrottle } from '../utils/throttle.ts';

/**
 * « Mot de passe oublié » DIFFUSÉ — même principe que la connexion.
 *
 * Sans annuaire, le portail ignore où vit un compte : il demande donc à toutes
 * les instances. Chacune reste silencieuse si l'email lui est inconnu, le cœur
 * ne distinguant déjà pas un compte absent d'un compte jamais activé.
 *
 * La réponse est TOUJOURS la même — succès —, que le compte existe ou non.
 * Une réponse différenciée ferait de cette route un oracle d'énumération de
 * comptes, exactement ce que le cœur évite de son côté ; le portail, qui
 * interroge quatre instances d'un coup, en serait un particulièrement bavard.
 *
 * Un compte présent sur plusieurs instances reçoit un lien par instance. C'est
 * volontaire et cohérent avec le sélecteur de la connexion : chaque lien ouvre
 * l'espace correspondant, et l'utilisateur choisit celui qu'il voulait.
 */
const RESET_TIMEOUT_MS = 10_000;
const throttled = createEmailThrottle();

/** N'échoue jamais : une instance muette ne doit rien révéler, ni retenir les autres. */
async function requestReset(instance: Instance, email: string): Promise<void> {
  try {
    await fetch(`${instance.url}/api/trpc/auth.requestPasswordReset`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(RESET_TIMEOUT_MS),
    });
  } catch {
    // Silence délibéré : l'utilisateur ne doit rien déduire de l'état des instances.
  }
}

export default defineHandler(async (event) => {
  const { email } = ((await readBody(event)) ?? {}) as { email?: string };
  if (!email) {
    event.res.status = 400;
    return { error: 'Adresse email requise' };
  }

  const normalized = email.trim().toLowerCase();
  if (throttled(normalized)) {
    event.res.status = 429;
    return { error: 'Trop de tentatives, réessayez dans quelques minutes' };
  }

  const known = instances();
  if (known.length === 0) {
    event.res.status = 503;
    return { error: 'Service momentanément indisponible, réessayez dans un instant' };
  }

  await Promise.all(known.map((instance) => requestReset(instance, normalized)));
  return { sent: true };
});
