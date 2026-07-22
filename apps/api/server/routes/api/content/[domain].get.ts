import { defineHandler } from 'nitro';
import { HTTPError } from 'h3';
import {
  CommunError,
  getOrganization,
  listActiveForms,
  listPublishedCouncilSessions,
  listPublishedDeliberations,
  listPublishedEntries,
  type StoreDb,
} from '@commun/core';
import { requireApiToken } from '../../../services/content-auth.ts';
import { useCore } from '../../../services/context.ts';

/**
 * Public content plane — consumed by the static site build. Bearer-token
 * authenticated; serves ONLY published content (scheduled publication
 * respected). System domains are resolved first; anything else falls through
 * to the collections engine by slug (news, events, officials, projects, and
 * any collection the commune defined).
 */
const SYSTEM_DOMAINS: Record<string, (db: StoreDb) => unknown> = {
  organization: (db) => getOrganization(db),
  'council-sessions': (db) => listPublishedCouncilSessions(db),
  deliberations: (db) => listPublishedDeliberations(db),
  forms: (db) => listActiveForms(db),
};

export default defineHandler((event) => {
  requireApiToken(event.req as unknown as Request);
  const domain = event.context.params?.domain ?? '';
  const db = useCore().db;

  const system = SYSTEM_DOMAINS[domain];
  if (system) return { [domain]: system(db) };

  try {
    return { [domain]: listPublishedEntries(db, domain) };
  } catch (error) {
    if (error instanceof CommunError && error.code === 'NOT_FOUND') {
      throw new HTTPError({ status: 404, message: `domaine de contenu inconnu: ${domain}` });
    }
    throw error;
  }
});
