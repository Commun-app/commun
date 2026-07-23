import { defineHandler } from 'nitro';
import { HTTPError } from 'h3';
import { CommunError, getOrganization, listPublishedEntries } from '@commun/core';
import { requireApiToken } from '../../../services/content-auth.ts';
import { useCore } from '../../../services/context.ts';

/**
 * Public content plane — consumed by the static site build (the heir of the
 * legacy `/content/deployment` + `/content/records` device endpoints).
 * Bearer-token authenticated; serves ONLY published content. `organization`
 * resolves the instance settings; anything else resolves a collection by slug
 * (news, events, officials, projects, and any collection the commune defined).
 */
export default defineHandler((event) => {
  requireApiToken(event.req as unknown as Request);
  const domain = event.context.params?.domain ?? '';
  const db = useCore().db;

  if (domain === 'organization') return { organization: getOrganization(db) };

  try {
    return { [domain]: listPublishedEntries(db, domain) };
  } catch (error) {
    if (error instanceof CommunError && error.code === 'NOT_FOUND') {
      throw new HTTPError({ status: 404, message: `domaine de contenu inconnu: ${domain}` });
    }
    throw error;
  }
});
