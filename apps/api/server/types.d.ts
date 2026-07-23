import type { Core } from '@commun/core';

declare module 'h3' {
  interface H3EventContext {
    /** The wired Core, attached per request by server/plugins/core.ts. */
    core: Core;
  }
}
