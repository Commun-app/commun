import { definePlugin } from 'nitro';
import { createCore } from '@commun/core';
import { setCore } from '../services/core-instance.ts';

/**
 * Composition plugin (review: idiomatic Nitro instead of a lazy singleton).
 * Boots the wired Core ONCE at server start — migrations apply here, not on
 * the first request — and runs boot housekeeping. The `0.core` middleware
 * exposes it to every handler via `event.context.core`.
 */
export default definePlugin(() => {
  const core = createCore();
  setCore(core);

  // Boot housekeeping: SQLite has no TTL indexes (unlike the legacy Mongo).
  void core.services.users.purgeExpired();
});
