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
  const theme = deployment.theme ?? settings.theme ?? undefined;
  const pageSlugs = (deployment.definition ?? [])
    .map((page) => page.path ?? '')
    .filter((path) => path && !path.includes(':'));

  return {
    name: 'success',
    description: 'Action succeed.',
    data: {
      // Iso legacy : l'ObjectId d'origine de l'organisation.
      _id: (settings.legacyExtra as { legacyId?: string } | null)?.legacyId ?? settings.id,
      name: settings.name,
      ...(deployment.sort !== undefined ? { sort: deployment.sort } : {}),
      // Iso legacy `_parseRecursively` : les chaînes `_media:<id>` de _theme/_pages
      // sont remplacées par le média signé. Clé OMISE quand le thème est absent
      // (iso JSON legacy — cas réel : cmar-paca sans deployment.theme).
      ...(theme !== undefined ? { _theme: await media.resolveMediaPlaceholders(theme) } : {}),
      _pages: await media.resolveMediaPlaceholders(deployment.definition ?? []),
      slugs: [...pageSlugs, ...(await collections.publishedSlugs())],
    },
  };
});
