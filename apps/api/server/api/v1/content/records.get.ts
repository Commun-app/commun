import { defineHandler } from 'nitro';
import { useCore } from '../../../utils/core.ts';

/**
 * Legacy-compat plane (iso `service-records` `GET /api/v1/content/records`):
 * the CURRENT site builds (module poulpus of grigny/lcss/pertuis) call this
 * exact path. Flat map of published entries keyed by id, media resolved.
 * Token guard: server/middleware/api-token.ts. Response wrapped like the
 * legacy http component did: `{ name, description, data }`.
 */
export default defineHandler(async (event) => {
  const records = await useCore().services.collections.legacyRecordsPayload();
  return { name: 'success', description: 'Action succeed.', data: { records } };
});
