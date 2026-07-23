import { defineHandler } from 'nitro';
import { appRouter } from '@commun/core/trpc';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { createRequestContext } from '../../../services/context.ts';

// Mounts the core tRPC router under /api/trpc/* on the API.
// In h3 v2, `event.req` is a Web-Fetch-compatible Request.
export default defineHandler(async (event) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: event.req as unknown as Request,
    router: appRouter,
    createContext: ({ req }) => createRequestContext(req),
  });
});
