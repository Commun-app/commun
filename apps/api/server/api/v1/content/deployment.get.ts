import { defineHandler } from 'nitro';
import { HTTPError } from 'h3';

/**
 * Legacy-compat plane (iso `service-records` `GET /api/v1/content/deployment`):
 * the payload the CURRENT site builds consume — `_theme` (visual identity),
 * `_pages` (legacy page definitions), `slugs` (static page paths + published
 * `/collection/slug` paths). Token guard: server/middleware/api-token.ts.
 */
export default defineHandler(async (event) => {
  const { organization, collections, media } = event.context.core.services;

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
      // Iso legacy `_parseRecursively` : les chaînes `_media:<id>` de _theme/_pages
      // sont remplacées par le média signé.
      _theme: await media.resolveMediaPlaceholders(deployment.theme ?? settings.theme ?? null),
      _pages: await media.resolveMediaPlaceholders(deployment.definition ?? []),
      slugs: [...pageSlugs, ...(await collections.publishedSlugs())],
    },
  };
});
