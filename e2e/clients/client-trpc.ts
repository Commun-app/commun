import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@commun/core';
import { API_URL } from '../constants.ts';

/** A typed tRPC client against the API — the same transport the admin uses. */
export function makeTrpc() {
  return createTRPCClient<AppRouter>({
    links: [httpBatchLink({ url: `${API_URL}/api/trpc` })],
  });
}

export type TrpcClient = ReturnType<typeof makeTrpc>;

// ── Helpers HTTP partagés (revue PR #1, 28/07) ──────────────────────────────
// Les steps n'écrivent plus leurs fetch : query (GET) / mutate (POST) parlent
// le protocole tRPC brut — pratique pour asserter statuts ET corps d'erreur.

export interface ApiResponse<T = unknown> {
  status: number;
  body: { result?: { data: T }; error?: { message: string; data?: { type?: string } } };
}

export async function trpcQuery<T = unknown>(
  procedure: string,
  options: { input?: unknown; token?: string } = {},
): Promise<ApiResponse<T>> {
  const input = options.input ? `?input=${encodeURIComponent(JSON.stringify(options.input))}` : '';
  const response = await fetch(`${API_URL}/api/trpc/${procedure}${input}`, {
    headers: options.token ? { authorization: `Bearer ${options.token}` } : {},
  });
  return { status: response.status, body: (await response.json()) as ApiResponse<T>['body'] };
}

export async function trpcMutate<T = unknown>(
  procedure: string,
  options: { input?: unknown; token?: string } = {},
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_URL}/api/trpc/${procedure}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: JSON.stringify(options.input ?? {}),
  });
  return { status: response.status, body: (await response.json()) as ApiResponse<T>['body'] };
}

/** Le `result.data` d'une réponse tRPC réussie. */
export function dataOf<T>(response: ApiResponse<T>): T {
  return response.body.result!.data;
}
