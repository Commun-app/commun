/**
 * Les instances que le portail connaît, lues depuis `PORTAL_INSTANCES`.
 *
 * Partagé par la connexion et la réinitialisation de mot de passe : faute
 * d'annuaire email → instance (voir `login.post.ts`), les deux s'adressent à
 * TOUTES les instances et laissent chacune répondre pour ce qu'elle sait.
 */
export interface Instance {
  slug: string;
  url: string;
}

/** `PORTAL_INSTANCES` : {"grigny":"https://grigny.…", …} */
export function instances(): Instance[] {
  try {
    const parsed = JSON.parse(process.env.PORTAL_INSTANCES ?? '{}') as Record<string, string>;
    return Object.entries(parsed).map(([slug, url]) => ({ slug, url }));
  } catch {
    return [];
  }
}
