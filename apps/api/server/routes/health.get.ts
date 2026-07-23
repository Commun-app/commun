import { defineHandler } from 'nitro';

export default defineHandler(async (event) => {
  const health = await event.context.core.services.health.check();
  return {
    status: health.ok ? 'ok' : 'degraded',
    service: '@commun/api',
    time: health.time,
    db: health.db,
  };
});
