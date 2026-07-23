import type { AuthSession, Core } from '@commun/core';

declare module 'h3' {
  interface H3EventContext {
    /** The wired Core, attached per request by server/plugins/core.ts. */
    core: Core;
    /** Authenticated session (or null), resolved by middleware/2.session.ts. */
    session: AuthSession | null;
  }
}
