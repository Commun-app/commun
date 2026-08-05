import { defineHandler } from 'nitro';
import { appRouter } from '@commun/core/trpc';
import type { AuthSession } from '@commun/core';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { useCore } from '../../utils/core.ts';

// Mounts the core tRPC router under /api/trpc/*. The context is assembled from
// what the plugin and the session middleware already attached to the event.
export default defineHandler(async (event) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: event.req as unknown as Request,
    router: appRouter,
    createContext: () => ({
      services: useCore().services,
      // Explicit cast: the h3 module augmentation does not apply across every
      // resolved version.
      session: (event.context.session as AuthSession | null | undefined) ?? null,
      requestMeta: {
        ua: event.req.headers.get('user-agent'),
        ip:
          event.req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
          event.context.clientAddress ??
          null,
      },
    }),
  });
});
