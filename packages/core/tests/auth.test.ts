import { beforeAll, afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import { connectDb, type StoreDb } from '../src/infrastructure/db/index.ts';
import { UsersRepository } from '../src/domains/users/repository.ts';
import { UsersService } from '../src/domains/users/service.ts';
import { CommunError } from '../src/common/errors/index.ts';

let dataDir: string;
let db: StoreDb;
let users: UsersService;

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'commun-auth-test-'));
  db = connectDb(dataDir);
  users = new UsersService(new UsersRepository(db));
});

afterAll(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

describe('UsersService — invitations et sessions', () => {
  test('full flow: invite → accept → login → session → targeted revoke → logout', async () => {
    const { token: inviteToken } = users.createInvitation({
      email: 'Maire@Grigny.fr',
      role: 'admin',
    });

    const user = await users.acceptInvitation(inviteToken, {
      name: 'Le Maire',
      password: 'correct-horse-battery',
    });
    expect(user.email).toBe('maire@grigny.fr'); // normalised lowercase
    expect(user.role).toBe('admin');
    expect(user.passwordHash).not.toContain('correct-horse-battery');

    // Le lien est consommé : une seconde utilisation échoue.
    await expect(
      users.acceptInvitation(inviteToken, { name: 'Intrus', password: 'whatever-pass' }),
    ).rejects.toThrow(CommunError);

    // Login avec mauvais mot de passe → null, bon mot de passe → session.
    expect(await users.login('maire@grigny.fr', 'wrong')).toBeNull();
    const first = await users.login('maire@grigny.fr', 'correct-horse-battery');
    const second = await users.login('maire@grigny.fr', 'correct-horse-battery');
    expect(first).not.toBeNull();

    // Liste des appareils : 2 sessions actives, la courante est marquée.
    const list = users.listSessions(user.id, second!.session.sessionId);
    expect(list).toHaveLength(2);
    expect(list.find((s) => s.current)?.id).toBe(second!.session.sessionId);

    // Révocation ciblée de la première session — la seconde reste valide.
    users.revokeOwnSession(user.id, first!.session.sessionId);
    expect(users.verifySession(first!.token)).toBeNull();
    expect(users.verifySession(second!.token)?.user.email).toBe('maire@grigny.fr');

    // Logout de la session courante.
    users.revokeSession(second!.session.sessionId);
    expect(users.verifySession(second!.token)).toBeNull();
  });

  test('revoking a session that belongs to someone else is refused', async () => {
    const { token } = users.createInvitation({ email: 'autre@grigny.fr', role: 'redacteur' });
    const other = await users.acceptInvitation(token, {
      name: 'Autre',
      password: 'password-solide',
    });
    const login = await users.login('autre@grigny.fr', 'password-solide');
    expect(() => users.revokeOwnSession('someone-else', login!.session.sessionId)).toThrow(
      CommunError,
    );
    expect(users.verifySession(login!.token)).not.toBeNull();
    expect(other.role).toBe('redacteur');
  });

  test('a forged session token verifies to null', () => {
    expect(users.verifySession('forged-token')).toBeNull();
  });

  test('an expired invitation is refused without leaking account info', async () => {
    const { token } = users.createInvitation({ email: 'agent@grigny.fr', role: 'redacteur' });
    db.run(
      sql`UPDATE invitations SET expires_at = '2000-01-01T00:00:00.000Z' WHERE used_at IS NULL`,
    );
    await expect(
      users.acceptInvitation(token, { name: 'Agent', password: 'some-password-1' }),
    ).rejects.toThrow('invitation invalide ou expirée');
  });
});
