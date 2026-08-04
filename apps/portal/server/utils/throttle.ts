/**
 * Fenêtre glissante PAR COMPTE, en mémoire.
 *
 * Le plafond par ADRESSE a été retiré du portail (décision Quentin 04/08) : il
 * vit désormais dans Traefik, attaché au routeur du portail. Le proxy est le
 * bon endroit pour cela — il voit toutes les requêtes, pas seulement celles qui
 * atteignent une route donnée. Il ne peut en revanche pas lire le corps, donc
 * il ignore quel COMPTE est visé : c'est ce que fait ce compteur, et lui seul.
 *
 * Le portail en a plus besoin qu'une instance : une requête y devient autant
 * d'appels qu'il y a d'instances, et il amplifierait sinon toute attaque.
 */
export function createEmailThrottle({ windowMs = 5 * 60_000, max = 10 } = {}) {
  const attempts = new Map<string, number[]>();
  return (email: string): boolean => {
    const now = Date.now();
    const recent = (attempts.get(email) ?? []).filter((at) => now - at < windowMs);
    recent.push(now);
    attempts.set(email, recent);
    return recent.length > max;
  };
}
