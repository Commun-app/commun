import { API_URL } from '../constants.ts';

/**
 * Client partagé du plan HTTP/REST legacy-compat (`/api/v1/**`) — le pendant
 * de client-trpc.ts pour l'autre protocole (revue PR #1, 28/07).
 */
export interface HttpResponse<T = unknown> {
  status: number;
  body: T;
}

export async function httpGet<T = unknown>(
  path: string,
  options: { bearer?: string; rawAuth?: string } = {},
): Promise<HttpResponse<T>> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: options.rawAuth
      ? { authorization: options.rawAuth }
      : options.bearer
        ? { authorization: `Bearer ${options.bearer}` }
        : {},
  });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    /* corps non-JSON (rare) — le statut suffit aux assertions */
  }
  return { status: response.status, body: body as T };
}
