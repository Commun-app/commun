import { defineHandler } from 'nitro';
import { consola } from 'consola';
import staticJson from '../../../data/politicus-mairie-marseille-15-16.json';
import { useCore } from '../../../utils/core.ts';

/**
 * Serves a static WordPress payload, still consumed by one site. On the
 * marseille15-16 instance, collaborator avatars are overlaid with real media
 * URLs, matched on the legacy `order` field. Unauthenticated, as before.
 */
export default defineHandler(async (event) => {
  const payload = structuredClone(staticJson) as {
    data?: { users?: Array<{ _id: string | number; avatar?: { objects?: unknown } }> };
  };

  try {
    const { organization, collections, media } = useCore().services;
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
