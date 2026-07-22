import { beforeAll, afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connectDb, type StoreDb } from '../src/infrastructure/db/index.ts';
import { createApiToken, revokeApiToken, verifyApiToken } from '../src/domains/users/tokens.ts';

let dataDir: string;
let db: StoreDb;

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'commun-tokens-test-'));
  db = connectDb(dataDir);
});

afterAll(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

describe('API tokens', () => {
  test('created token verifies, revoked token does not, plaintext is never stored', () => {
    const { token, record } = createApiToken(db, 'site-build');
    expect(token.startsWith('commun_')).toBe(true);
    expect(record.tokenHash).not.toContain(token);
    expect(verifyApiToken(db, token)).toBe(true);
    expect(verifyApiToken(db, 'commun_forged')).toBe(false);

    revokeApiToken(db, record.id);
    expect(verifyApiToken(db, token)).toBe(false);
  });
});
