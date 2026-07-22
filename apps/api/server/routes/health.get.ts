import { defineHandler } from 'nitro';
import { useCore } from '../services/context.ts';

export default defineHandler(async () => {
  const health = await useCore().health.check();
  return {
    status: health.ok ? 'ok' : 'degraded',
    service: '@commun/api',
    time: health.time,
    db: health.db,
  };
});
