import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@commun/core';

// The API under test (Playwright's webServer boots it on the dedicated port).
const API_URL = process.env.E2E_API_URL ?? 'http://127.0.0.1:3101';

/** A typed tRPC client against the API — the same transport the admin uses. */
export function makeTrpc() {
  return createTRPCClient<AppRouter>({
    links: [httpBatchLink({ url: `${API_URL}/api/trpc` })],
  });
}

export type TrpcClient = ReturnType<typeof makeTrpc>;
