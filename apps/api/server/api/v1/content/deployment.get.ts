import { defineHandler } from 'nitro';
import { HTTPError } from 'h3';
import { useCore } from '../../../utils/core.ts';

/**
 * Legacy-compatible plane: the payload current site builds consume —
 * `_theme` (visual identity), `_pages` (page definitions) and `slugs`
 * (static paths plus every published `/collection/slug`).
 */
export default defineHandler(async (event) => {
  const { organization, collections, media } = useCore().services;

  const settings = await organization.get();
  if (!settings) throw new HTTPError({ status: 404, message: 'organization not initialized' });

  const deployment = (settings.deployment ?? {}) as {
    theme?: unknown;
    definition?: Array<{ path?: string }>;
    sort?: unknown;
  };
  // Le thème vit dans deployment.theme (revue 28/07 : colonne organization
  // .theme retirée) — fallback sur settings.theme si la migration l'y a mis.
  const theme =
    deployment.theme ?? (settings.settings as { theme?: unknown } | null)?.theme ?? undefined;
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
