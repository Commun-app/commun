import { createHash, randomBytes } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import type { StoreDb } from '../../infrastructure/db/index.ts';
import { apiTokens, type ApiToken } from './schema.ts';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/**
 * Create a machine token for the public content plane (site builds).
 * The plaintext is returned ONCE — only its sha256 lands in the database.
 */
export function createApiToken(db: StoreDb, name: string): { token: string; record: ApiToken } {
  const token = `commun_${randomBytes(24).toString('base64url')}`;
  const record = db.insert(apiTokens).values({ name, tokenHash: hashToken(token) }).returning().get();
  return { token, record };
}

/** True if the bearer token matches a non-revoked API token (stamps lastUsedAt). */
export function verifyApiToken(db: StoreDb, token: string): boolean {
  const found = db
    .select()
    .from(apiTokens)
    .where(and(eq(apiTokens.tokenHash, hashToken(token)), isNull(apiTokens.revokedAt)))
    .get();
  if (!found) return false;
  db.update(apiTokens)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(apiTokens.id, found.id))
    .run();
  return true;
}

export function revokeApiToken(db: StoreDb, id: string): void {
  db.update(apiTokens).set({ revokedAt: new Date().toISOString() }).where(eq(apiTokens.id, id)).run();
}
