import type { H3Event } from 'h3';
import { definePlugin } from 'nitro';
import { createCore } from '@commun/core';

/**
 * Composition plugin — https://nitro.build/docs/plugins. Boots the wired Core
 * ONCE at server start (migrations and boot housekeeping happen here, not on
 * the first request) and attaches it to `event.context.core` for every
 * handler via the `request` runtime hook.
 */
export default definePlugin((nitro) => {
  const core = createCore();

  // Boot housekeeping: SQLite has no TTL indexes (unlike the legacy Mongo).
  void core.services.users.purgeExpired();

  nitro.hooks.hook('request', (event) => {
    // The beta typing exposes HTTPEvent here, but the runtime object is the
    // full h3 event — context included.
    (event as unknown as H3Event).context.core = core;
  });
});
