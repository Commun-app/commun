import { defineHandler } from 'nitro';
import { HTTPError } from 'h3';
import { useCore } from '../../../../services/context.ts';

/**
 * Serves LOCAL-driver media objects (public read: published sites embed these
 * URLs). S3-driver instances never hit this route — their URLs are signed
 * object-storage URLs. Traversal is refused by the storage driver itself.
 */
const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
};

export default defineHandler(async (event) => {
  const key = event.context.params?.key ?? '';
  const bytes = await useCore().storage.get(key);
  if (!bytes) throw new HTTPError({ status: 404, message: 'objet introuvable' });

  const extension = key.split('.').pop()?.toLowerCase() ?? '';
  return new Response(new Uint8Array(bytes).buffer as ArrayBuffer, {
    headers: {
      'content-type': CONTENT_TYPES[extension] ?? 'application/octet-stream',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
});
