import { beforeAll, afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import { connectDb, type StoreDb } from '../src/infrastructure/db/index.ts';
import {
  acceptInvitation,
  createInvitation,
  login,
  revokeSession,
  verifySession,
} from '../src/domains/users/auth.ts';
import { CommunError } from '../src/common/errors/index.ts';

let dataDir: string;
let db: StoreDb;

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'commun-auth-test-'));
  db = connectDb(dataDir);
});

afterAll(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

describe('invitations à usage unique', () => {
  test('full flow: invite → accept → login → session → logout', async () => {
    const { token: inviteToken } = createInvitation(db, {
      email: 'Maire@Grigny.fr',
      role: 'admin',
    });

    const user = await acceptInvitation(db, inviteToken, {
      name: 'Le Maire',
      password: 'correct-horse-battery',
    });
    expect(user.email).toBe('maire@grigny.fr'); // normalised lowercase
    expect(user.role).toBe('admin');
    expect(user.passwordHash).not.toContain('correct-horse-battery');

    // Le lien est consommé : une seconde utilisation échoue.
    await expect(
      acceptInvitation(db, inviteToken, { name: 'Intrus', password: 'whatever-pass' }),
    ).rejects.toThrow(CommunError);

    // Login avec mauvais mot de passe → null, bon mot de passe → session.
    expect(await login(db, 'maire@grigny.fr', 'wrong')).toBeNull();
    const result = await login(db, 'maire@grigny.fr', 'correct-horse-battery');
    expect(result).not.toBeNull();

    // Le token de session vérifie ; après révocation, il ne vérifie plus.
    const auth = verifySession(db, result!.token);
    expect(auth?.user.email).toBe('maire@grigny.fr');
    revokeSession(db, auth!.sessionId);
    expect(verifySession(db, result!.token)).toBeNull();
  });

  test('a forged or expired session token verifies to null', () => {
    expect(verifySession(db, 'forged-token')).toBeNull();
  });

  test('an expired invitation is refused without leaking account info', async () => {
    const { token } = createInvitation(db, { email: 'agent@grigny.fr', role: 'redacteur' });
    // Force l'expiration en base.
    db.run(sql`UPDATE invitations SET expires_at = '2000-01-01T00:00:00.000Z'`);
    await expect(
      acceptInvitation(db, token, { name: 'Agent', password: 'some-password-1' }),
    ).rejects.toThrow('invitation invalide ou expirée');
  });
});
