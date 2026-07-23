import { defineHandler } from 'nitro';
import { HTTPError } from 'h3';
import { CommunError } from '@commun/core';
import { requireApiToken } from '../../../services/content-auth.ts';
import { useCore } from '../../../services/context.ts';

/**
 * Public content plane — the heir of the legacy device endpoints
 * (`/content/records` + `/devices/fetch-all`): the static site build fetches
 * everything it renders from here at build time, authenticated by API token.
 * Serves ONLY published content; media field values are resolved to URLs
 * (parity with the legacy signed-media resolution). `organization` returns
 * the instance settings; anything else resolves a collection by slug.
 */
export default defineHandler(async (event) => {
  requireApiToken(event.req as unknown as Request);
  const domain = event.context.params?.domain ?? '';
  const services = useCore().services;

  if (domain === 'organization') return { organization: services.organization.get() };

  try {
    return { [domain]: await services.collections.listPublishedEntriesResolved(domain) };
  } catch (error) {
    if (error instanceof CommunError && error.code === 'NOT_FOUND') {
      throw new HTTPError({ status: 404, message: `domaine de contenu inconnu: ${domain}` });
    }
    throw error;
  }
});
