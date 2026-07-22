import { beforeAll, afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connectDb, type StoreDb } from '../src/infrastructure/db/index.ts';
import {
  createActualite,
  listPublishedActualites,
  updateActualite,
} from '../src/domains/actualites/queries.ts';
import { createApiToken, revokeApiToken, verifyApiToken } from '../src/domains/users/tokens.ts';

let dataDir: string;
let db: StoreDb;

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'commun-actualites-test-'));
  db = connectDb(dataDir);
});

afterAll(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

describe('actualites — plan publié', () => {
  test('drafts and future-scheduled items stay off the public plane', () => {
    createActualite(db, { title: 'Brouillon', slug: 'brouillon' });
    const published = createActualite(db, { title: 'Publiée', slug: 'publiee' });
    updateActualite(db, published.id, { status: 'published' });
    const scheduled = createActualite(db, { title: 'Programmée', slug: 'programmee' });
    updateActualite(db, scheduled.id, {
      status: 'published',
      publishedAt: new Date(Date.now() + 86_400_000).toISOString(),
    });

    const visible = listPublishedActualites(db);
    expect(visible.map((a) => a.slug)).toEqual(['publiee']);
  });

  test('a past publishedAt makes the item visible', () => {
    const item = createActualite(db, { title: 'Passée', slug: 'passee' });
    updateActualite(db, item.id, {
      status: 'published',
      publishedAt: new Date(Date.now() - 86_400_000).toISOString(),
    });
    expect(listPublishedActualites(db).map((a) => a.slug)).toContain('passee');
  });
});

describe('tokens API', () => {
  test('created token verifies, revoked token does not, plaintext is never stored', () => {
    const { token, record } = createApiToken(db, 'build-site');
    expect(token.startsWith('commun_')).toBe(true);
    expect(record.tokenHash).not.toContain(token);
    expect(verifyApiToken(db, token)).toBe(true);
    expect(verifyApiToken(db, 'commun_forged')).toBe(false);

    revokeApiToken(db, record.id);
    expect(verifyApiToken(db, token)).toBe(false);
  });
});
