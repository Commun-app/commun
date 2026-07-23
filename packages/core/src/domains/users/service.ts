import { createHash, randomBytes } from 'node:crypto';
import { CommunError, ERR } from '../../common/errors/index.ts';
import type { UsersRepository } from './repository.ts';
import type { ApiToken, User } from './schema.ts';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const nowIso = () => new Date().toISOString();

const SESSION_TTL_MS = 30 * 24 * 3600 * 1000; // 30 jours
const INVITATION_TTL_MS = 7 * 24 * 3600 * 1000; // 7 jours

// Verified against when the email is unknown, so login cost is identical for
// existing and non-existing accounts (no user-enumeration timing oracle).
const DUMMY_HASH = Bun.password.hashSync('commun-dummy-password-for-timing');

export interface AuthSession {
  sessionId: string;
  user: User;
  expiresAt: string;
}

/**
 * Identity & access of the instance: passwords (argon2id via Bun.password),
 * opaque hashed sessions, single-use invitations and machine API tokens.
 * Everything token-like is random (crypto), shown once, stored hashed.
 */
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  // ── Passwords ──────────────────────────────────────────────────────────────

  hashPassword(password: string): Promise<string> {
    return Bun.password.hash(password);
  }

  verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    return Bun.password.verify(password, passwordHash);
  }

  // ── Sessions ───────────────────────────────────────────────────────────────

  async login(
    email: string,
    password: string,
  ): Promise<{ token: string; session: AuthSession } | null> {
    const user = this.repository.findUserByEmail(email.toLowerCase());
    // Always run one argon2 verification — unknown emails cost the same as known ones.
    const verified = await this.verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user?.passwordHash || !verified) return null;
    return this.createSession(user);
  }

  createSession(user: User): { token: string; session: AuthSession } {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    const row = this.repository.insertSession({
      tokenHash: sha256(token),
      userId: user.id,
      expiresAt,
    });
    return { token, session: { sessionId: row.id, user, expiresAt } };
  }

  verifySession(token: string): AuthSession | null {
    const row = this.repository.findActiveSessionWithUser(sha256(token), nowIso());
    if (!row) return null;
    return { sessionId: row.session.id, user: row.user, expiresAt: row.session.expiresAt };
  }

  revokeSession(sessionId: string): void {
    this.repository.revokeSession(sessionId, nowIso());
  }

  /** Active sessions of a user (device list — legacy `account/me` parity). */
  listSessions(userId: string, currentSessionId: string) {
    return this.repository.listActiveSessionsByUser(userId, nowIso()).map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      current: session.id === currentSessionId,
    }));
  }

  /** Revoke ONE of the caller's own sessions (targeted device logout). */
  revokeOwnSession(userId: string, sessionId: string): void {
    const session = this.repository.findSessionById(sessionId);
    if (!session || session.userId !== userId) {
      throw new CommunError(ERR.NOT_FOUND, `session introuvable: ${sessionId}`);
    }
    this.repository.revokeSession(sessionId, nowIso());
  }

  /** Boot housekeeping — SQLite has no TTL indexes, unlike the legacy Mongo. */
  purgeExpired(): void {
    this.repository.purgeExpired(nowIso());
  }

  // ── Invitations ────────────────────────────────────────────────────────────

  createInvitation(input: { email: string; role: 'admin' | 'redacteur' }): {
    token: string;
    expiresAt: string;
  } {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS).toISOString();
    this.repository.insertInvitation({
      email: input.email.toLowerCase(),
      role: input.role,
      tokenHash: sha256(token),
      expiresAt,
    });
    return { token, expiresAt };
  }

  /**
   * Consume an invitation: activates (or creates) the user with the given
   * password and marks the link used. Expired or already-used links are
   * refused without leaking whether the email exists.
   */
  async acceptInvitation(token: string, input: { name: string; password: string }): Promise<User> {
    const invitation = this.repository.findValidInvitation(sha256(token), nowIso());
    if (!invitation) throw new CommunError(ERR.INVALID_STATE, 'invitation invalide ou expirée');

    const user = this.repository.activateUser({
      email: invitation.email,
      name: input.name,
      passwordHash: await this.hashPassword(input.password),
      role: invitation.role,
    });
    this.repository.markInvitationUsed(invitation.id, nowIso());
    return user;
  }

  // ── Users management ───────────────────────────────────────────────────────

  listUsers(): User[] {
    return this.repository.listUsers();
  }

  hasAnyUser(): boolean {
    return this.repository.hasAnyUser();
  }

  removeUser(actorId: string, id: string): void {
    if (id === actorId) {
      throw new CommunError(ERR.INVALID_STATE, 'impossible de supprimer son propre compte');
    }
    this.repository.deleteUser(id);
  }

  updateUser(id: string, input: { name?: string; role?: 'admin' | 'redacteur' }): User {
    const updated = this.repository.updateUser(id, input);
    if (!updated) throw new CommunError(ERR.NOT_FOUND, `utilisateur introuvable: ${id}`);
    return updated;
  }

  // ── API tokens (machine plane) ─────────────────────────────────────────────

  /** The plaintext token is returned ONCE — only its sha256 lands in the database. */
  createApiToken(name: string): { token: string; record: ApiToken } {
    const token = `commun_${randomBytes(24).toString('base64url')}`;
    const record = this.repository.insertApiToken({ name, tokenHash: sha256(token) });
    return { token, record };
  }

  /** True if the bearer token matches a non-revoked API token (stamps lastUsedAt). */
  verifyApiToken(token: string): boolean {
    const found = this.repository.findActiveApiToken(sha256(token));
    if (!found) return false;
    this.repository.touchApiToken(found.id, nowIso());
    return true;
  }

  revokeApiToken(id: string): void {
    this.repository.revokeApiToken(id, nowIso());
  }

  listApiTokens() {
    return this.repository.listApiTokens();
  }
}
