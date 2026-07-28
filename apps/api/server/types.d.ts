import type { AuthSession } from '@commun/core';

declare module 'h3' {
  interface H3EventContext {
    /** Authenticated session (or null), resolved by middleware/2.session.ts. */
    session: AuthSession | null;
  }
}
