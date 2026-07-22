import { defineHandler } from 'nitro';
import { listPublishedEntries } from '@commun/core';
import { requireApiToken } from '../../../../services/content-auth.ts';
import { useCore } from '../../../../services/context.ts';

/** Public plane of a custom collection: its published entries, by slug. */
export default defineHandler((event) => {
  requireApiToken(event.req as unknown as Request);
  const slug = event.context.params?.slug ?? '';
  return { entries: listPublishedEntries(useCore().db, slug) };
});
