import { defineHandler } from 'nitro';
import { consola } from 'consola';
import staticJson from '../../../data/politicus-mairie-marseille-15-16.json';

/**
 * Legacy-compat plane (iso `service-records`
 * `GET /api/v1/content/wordpress-marseille-15-16`, still consumed — review
 * decision of Quentin): serves the static WordPress JSON. When THIS instance
 * is the marseille15-16 organization, the collaborator avatars are overlaid
 * with signed URLs (matched by the legacy `order` field = WordPress user id).
 * Unauthenticated, exactly like the legacy route.
 */
export default defineHandler(async (event) => {
  const payload = structuredClone(staticJson) as {
    data?: { users?: Array<{ _id: string | number; avatar?: { objects?: unknown } }> };
  };

  try {
    const { organization, collections, media } = event.context.core.services;
    if ((await organization.get())?.slug !== 'marseille15-16' || !payload.data?.users) {
      return payload;
    }

    const avatarByOrder = new Map<string, Record<string, string>>();
    for (const entry of await collections.listPublishedEntries('collaborators')) {
      const order = entry.data.order;
      const cover = entry.data.cover;
      const mediaId = Array.isArray(cover) ? cover[0] : cover;
      if (order == null || typeof mediaId !== 'string' || !mediaId) continue;
      const url = await media.url(mediaId);
      if (!url) continue;
      // The legacy pointed every webp variant at the same original.
      avatarByOrder.set(String(order), {
        original: url,
        'webp-1800': url,
        'webp-1320': url,
        'webp-840': url,
        'webp-480': url,
        'webp-1320-thumb': url,
        'webp-840-thumb': url,
        'webp-480-thumb': url,
      });
    }

    payload.data.users = payload.data.users.map((user) => {
      const objects = avatarByOrder.get(String(user._id));
      return objects ? { ...user, avatar: { ...user.avatar, objects } } : user;
    });
    return payload;
  } catch (error) {
    consola.warn('wordpress-marseille-15-16: fallback JSON statique —', error);
    return payload;
  }
});
