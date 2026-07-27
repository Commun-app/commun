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
    const { token: inviteToken } = await users.createInvitation({
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
    const list = await users.listSessions(user.id, second!.session.sessionId);
    expect(list).toHaveLength(2);
    expect(list.find((s) => s.current)?.id).toBe(second!.session.sessionId);

    // Révocation ciblée de la première session — la seconde reste valide.
    await users.revokeOwnSession(user.id, first!.session.sessionId);
    expect(await users.verifySession(first!.token)).toBeNull();
    expect((await users.verifySession(second!.token))?.user.email).toBe('maire@grigny.fr');

    // Logout de la session courante.
    await users.revokeSession(second!.session.sessionId);
    expect(await users.verifySession(second!.token)).toBeNull();
  });

  test('revoking a session that belongs to someone else is refused', async () => {
    const { token } = await users.createInvitation({ email: 'autre@grigny.fr', role: 'redacteur' });
    const other = await users.acceptInvitation(token, {
      name: 'Autre',
      password: 'password-solide',
    });
    const login = await users.login('autre@grigny.fr', 'password-solide');
    expect(() => users.revokeOwnSession('someone-else', login!.session.sessionId)).toThrow(
      CommunError,
    );
    expect(await users.verifySession(login!.token)).not.toBeNull();
    expect(other.role).toBe('redacteur');
  });

  test('a forged session token verifies to null', async () => {
    expect(await users.verifySession('forged-token')).toBeNull();
  });

  test('an expired invitation is refused without leaking account info', async () => {
    const { token } = await users.createInvitation({ email: 'agent@grigny.fr', role: 'redacteur' });
    db.run(
      sql`UPDATE invitations SET expires_at = '2000-01-01T00:00:00.000Z' WHERE used_at IS NULL`,
    );
    await expect(
      users.acceptInvitation(token, { name: 'Agent', password: 'some-password-1' }),
    ).rejects.toThrow('invitation invalide ou expirée');
  });
});

describe('UsersService — emails transactionnels (9.9)', () => {
  const sent: Array<{ to: string; template: string; variables: Record<string, string> }> = [];
  let mailer: UsersService;

  beforeAll(() => {
    mailer = new UsersService(new UsersRepository(db), {
      email: {
        kind: 'webhook',
        send: async (message) => {
          sent.push(message);
        },
      },
      adminUrl: 'https://admin.grigny.commun.app',
    });
  });

  test("l'invitation envoie un email avec le lien /welcome/<token>", async () => {
    const { token } = await mailer.createInvitation({ email: 'nouvelle@grigny.fr', role: 'redacteur' });
    const message = sent.at(-1)!;
    expect(message.to).toBe('nouvelle@grigny.fr');
    expect(message.template).toBe('invitation');
    expect(message.variables.url).toBe(`https://admin.grigny.commun.app/welcome/${token}`);
  });

  test('mot de passe oublié : lien single-use, nom conservé, pas d\'oracle', async () => {
    await mailer.acceptInvitation((await mailer.createInvitation({ email: 'oubli@grigny.fr', role: 'admin' })).token, {
      name: 'Tête en l\'air',
      password: 'premier-mot-de-passe',
    });

    // Email inconnu : aucune erreur, aucun envoi (réponse indiscernable).
    const before = sent.length;
    await mailer.requestPasswordReset('inconnu@nulle-part.fr');
    expect(sent.length).toBe(before);

    // Compte existant : email de reset avec lien /password/define/<token>.
    await mailer.requestPasswordReset('oubli@grigny.fr');
    const message = sent.at(-1)!;
    expect(message.template).toBe('password-reset');
    const token = message.variables.url.split('/password/define/')[1]!;

    // Consommation SANS nom : le mot de passe change, le nom est conservé.
    const user = await mailer.acceptInvitation(token, { password: 'nouveau-mot-de-passe' });
    expect(user.name).toBe('Tête en l\'air');
    expect(await mailer.login('oubli@grigny.fr', 'nouveau-mot-de-passe')).not.toBeNull();
    expect(await mailer.login('oubli@grigny.fr', 'premier-mot-de-passe')).toBeNull();
  });

  test("un échec d'envoi webhook ne casse pas la création d'invitation", async () => {
    const broken = new UsersService(new UsersRepository(db), {
      email: {
        kind: 'webhook',
        send: async () => {
          throw new Error('webhook 500');
        },
      },
    });
    const { token } = await broken.createInvitation({ email: 'resiliente@grigny.fr', role: 'redacteur' });
    expect(token.length).toBeGreaterThan(20);
  });
});
