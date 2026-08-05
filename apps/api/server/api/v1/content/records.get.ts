import { defineHandler } from 'nitro';
import { useCore } from '../../../utils/core.ts';

/**
 * Legacy-compatible plane: the current site builds call this exact path.
 * Flat map of published entries keyed by id, media resolved, wrapped in the
 * `{ name, description, data }` envelope those clients expect.
 */
export default defineHandler(async (event) => {
  const records = await useCore().services.collections.legacyRecordsPayload();
  return { name: 'success', description: 'Action succeed.', data: { records } };
});
