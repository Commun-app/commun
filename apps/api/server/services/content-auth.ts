import { HTTPError } from 'h3';
import { verifyApiToken } from '@commun/core';
import { useCore } from './context.ts';

/** Bearer-token guard of the public content plane (spec api-server). */
export function requireApiToken(req: Request): void {
  const core = useCore();
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : '';
  if (!token || !verifyApiToken(core.db, token)) {
    throw new HTTPError({ status: 401, message: 'token API manquant ou invalide' });
  }
}

/**
 * Minimal fixed-window rate limiter for the anonymous submission route.
 * Per-instance and in-memory by design: one instance = one collectivité,
 * traffic is small — no external store needed.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const windows = new Map<string, { start: number; count: number }>();

export function rateLimit(ip: string): void {
  const now = Date.now();
  const window = windows.get(ip);
  if (!window || now - window.start > WINDOW_MS) {
    windows.set(ip, { start: now, count: 1 });
    return;
  }
  window.count += 1;
  if (window.count > MAX_PER_WINDOW) {
    throw new HTTPError({ status: 429, message: 'trop de soumissions, réessayez dans une minute' });
  }
}
