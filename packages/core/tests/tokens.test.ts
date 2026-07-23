import { beforeAll, afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connectDb } from '../src/infrastructure/db/index.ts';
import { UsersRepository } from '../src/domains/users/repository.ts';
import { UsersService } from '../src/domains/users/service.ts';

let dataDir: string;
let users: UsersService;

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'commun-tokens-test-'));
  users = new UsersService(new UsersRepository(connectDb(dataDir)));
});

afterAll(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

describe('UsersService — API tokens', () => {
  test('created token verifies, revoked token does not, plaintext is never stored', () => {
    const { token, record } = users.createApiToken('site-build');
    expect(token.startsWith('commun_')).toBe(true);
    expect(record.tokenHash).not.toContain(token);
    expect(users.verifyApiToken(token)).toBe(true);
    expect(users.verifyApiToken('commun_forged')).toBe(false);

    users.revokeApiToken(record.id);
    expect(users.verifyApiToken(token)).toBe(false);
  });
});
