import { defineHandler } from 'nitro';
import { HTTPError } from 'h3';
import {
  getCollectivite,
  listActiveFormulaires,
  listPublishedActualites,
  listPublishedDeliberations,
  listPublishedElus,
  listPublishedEvenements,
  listPublishedProjets,
  listPublishedSeances,
  type StoreDb,
} from '@commun/core';
import { requireApiToken } from '../../../services/content-auth.ts';
import { useCore } from '../../../services/context.ts';

/**
 * Public content plane — consumed by the static site build. Bearer-token
 * authenticated; serves ONLY published content (scheduled publication
 * respected). One route per domain, resolved dynamically.
 */
const DOMAINS: Record<string, (db: StoreDb) => unknown> = {
  collectivite: (db) => getCollectivite(db),
  actualites: (db) => listPublishedActualites(db),
  agenda: (db) => listPublishedEvenements(db),
  elus: (db) => listPublishedElus(db),
  projets: (db) => listPublishedProjets(db),
  seances: (db) => listPublishedSeances(db),
  deliberations: (db) => listPublishedDeliberations(db),
  formulaires: (db) => listActiveFormulaires(db),
};

export default defineHandler((event) => {
  requireApiToken(event.req as unknown as Request);
  const domain = event.context.params?.domain ?? '';
  const load = DOMAINS[domain];
  if (!load) throw new HTTPError({ status: 404, message: `domaine de contenu inconnu: ${domain}` });
  return { [domain]: load(useCore().db) };
});
