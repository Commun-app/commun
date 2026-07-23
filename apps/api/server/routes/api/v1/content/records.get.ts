import { defineHandler } from 'nitro';
import { requireApiToken } from '../../../../services/content-auth.ts';
import { useCore } from '../../../../services/context.ts';

/**
 * Legacy-compat plane (iso `service-records` `GET /api/v1/content/records`):
 * the CURRENT site builds (module poulpus of grigny/lcss/pertuis) call this
 * exact path with a raw Authorization header. Flat map of published entries
 * keyed by id, media resolved. Response wrapped like the legacy http
 * component did: `{ data: { records } }`.
 */
export default defineHandler(async (event) => {
  requireApiToken(event.req as unknown as Request);
  const records = await useCore().services.collections.legacyRecordsPayload();
  return { name: 'success', description: 'Action succeed.', data: { records } };
});
