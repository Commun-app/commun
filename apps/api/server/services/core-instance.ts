import type { Core } from '@commun/core';

/**
 * Holder of the single Core instance. The plugin (server/plugins/core.ts)
 * boots it at server start; the `0.core` middleware attaches it to
 * `event.context.core` for every handler.
 */
let instance: Core | null = null;

export function setCore(core: Core): void {
  instance = core;
}

export function getCore(): Core {
  if (!instance) throw new Error('Core non initialisé — plugin core.ts non exécuté');
  return instance;
}
