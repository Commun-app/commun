import { defineHandler } from 'nitro';
import { HTTPError } from 'h3';

/**
 * Legacy-compat plane (iso `service-records` `GET /api/v1/content/deployment`):
 * the payload the CURRENT site builds consume — `_theme` (visual identity),
 * `_pages` (legacy page definitions), `slugs` (static page paths + published
 * `/collection/slug` paths). Token guard: server/middleware/api-token.ts.
 */
export default defineHandler(async (event) => {
  const { organization, collections } = event.context.core.services;

  const settings = await organization.get();
  if (!settings) throw new HTTPError({ status: 404, message: 'collectivité non initialisée' });

  const deployment = (settings.deployment ?? {}) as {
    theme?: unknown;
    definition?: Array<{ path?: string }>;
    sort?: unknown;
  };
  const pageSlugs = (deployment.definition ?? [])
    .map((page) => page.path ?? '')
    .filter((path) => path && !path.includes(':'));

  return {
    name: 'success',
    description: 'Action succeed.',
    data: {
      _id: settings.id,
      name: settings.name,
      sort: deployment.sort ?? null,
      _theme: deployment.theme ?? settings.theme ?? null,
      _pages: deployment.definition ?? [],
      slugs: [...pageSlugs, ...(await collections.publishedSlugs())],
    },
  };
});
