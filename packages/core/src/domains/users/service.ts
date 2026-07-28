import { createHash, randomBytes } from 'node:crypto';
import { consola } from 'consola';
import {
  CannotRemoveSelfError,
  InvitationInvalidError,
  SessionNotFoundError,
  UserNotFoundError,
} from './errors.ts';
import type { EmailEvent, EmailService } from '../../infrastructure/email/index.ts';
import type { UsersRepository } from './repository.ts';
import type { ApiToken, User } from './schema.ts';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const nowIso = () => new Date().toISOString();

const SESSION_TTL_MS = 30 * 24 * 3600 * 1000; // 30 jours
const INVITATION_TTL_MS = 7 * 24 * 3600 * 1000; // 7 jours

// Verified against when the email is unknown, so login cost is identical for
// existing and non-existing accounts (no user-enumeration timing oracle).
const DUMMY_HASH = Bun.password.hashSync('commun-dummy-password-for-timing');

/** Device metadata captured at login (iso legacy: the account page lists devices). */
export interface SessionMeta {
  ua?: string | null;
  ip?: string | null;
}

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
  constructor(
    private readonly repository: UsersRepository,
    private readonly options: { email?: EmailService; adminUrl?: string } = {},
  ) {}

  /** Émission best-effort : un échec du webhook email ne casse jamais le flux. */
  private async sendEmailEvent(event: EmailEvent): Promise<void> {
    try {
      await this.options.email?.sendEvent(event);
    } catch (error) {
      consola.warn(
        `[email] échec d'émission ${event.eventName} → ${event.email}: ${String(error)}`,
      );
    }
  }

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
    meta?: SessionMeta,
  ): Promise<{ token: string; session: AuthSession } | null> {
    const user = await this.repository.findUserByEmail(email.toLowerCase());
    // Always run one argon2 verification — unknown emails cost the same as known ones.
    const verified = await this.verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user?.passwordHash || !verified) return null;
    return this.createSession(user, meta);
  }

  async createSession(
    user: User,
    meta?: SessionMeta,
  ): Promise<{ token: string; session: AuthSession }> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    const row = await this.repository.insertSession({
      tokenHash: sha256(token),
      userId: user.id,
      expiresAt,
      ua: meta?.ua ?? null,
      ip: meta?.ip ?? null,
    });
    return { token, session: { sessionId: row.id, user, expiresAt } };
  }

  async verifySession(token: string): Promise<AuthSession | null> {
    const row = await this.repository.findActiveSessionWithUser(sha256(token), nowIso());
    if (!row) return null;
    return { sessionId: row.session.id, user: row.user, expiresAt: row.session.expiresAt };
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.repository.revokeSession(sessionId, nowIso());
  }

  /** Active sessions of a user (device list — legacy `account/me` parity). */
  async listSessions(userId: string, currentSessionId: string) {
    const sessions = await this.repository.listActiveSessionsByUser(userId, nowIso());
    return sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      ua: session.ua,
      ip: session.ip,
      current: session.id === currentSessionId,
    }));
  }

  /** Revoke ONE of the caller's own sessions (targeted device logout). */
  async revokeOwnSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.repository.findSessionById(sessionId);
    if (!session || session.userId !== userId) {
      throw new SessionNotFoundError(`session introuvable: ${sessionId}`);
    }
    await this.repository.revokeSession(sessionId, nowIso());
  }

  /** Boot housekeeping — SQLite has no TTL indexes, unlike the legacy Mongo. */
  async purgeExpired(): Promise<void> {
    await this.repository.purgeExpired(nowIso());
  }

  // ── Invitations ────────────────────────────────────────────────────────────

  async createInvitation(input: {
    email: string;
    role: 'admin' | 'redacteur';
  }): Promise<{ token: string; expiresAt: string }> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS).toISOString();
    await this.repository.insertInvitation({
      email: input.email.toLowerCase(),
      role: input.role,
      tokenHash: sha256(token),
      expiresAt,
    });
    // 9.9 : événement d'invitation (le legacy n'envoyait jamais d'email).
    // Best-effort — le lien reste retourné à l'admin quoi qu'il arrive.
    await this.sendEmailEvent({
      email: input.email.toLowerCase(),
      eventName: 'userInvited',
      eventProperties: { url: `${this.options.adminUrl ?? ''}/welcome/${token}` },
    });
    return { token, expiresAt };
  }

  /**
   * « Mot de passe oublié » (9.9) : réutilise le mécanisme d'invitation —
   * un lien single-use qui redéfinit le mot de passe du compte existant.
   * Réponse identique que l'email existe ou non (pas d'oracle d'énumération).
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.repository.findUserByEmail(email.toLowerCase());
    if (!user?.passwordHash) return; // compte inconnu ou jamais activé : silence
    const token = randomBytes(32).toString('base64url');
    await this.repository.insertInvitation({
      email: user.email,
      role: user.role,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS).toISOString(),
    });
    await this.sendEmailEvent({
      email: user.email,
      eventName: 'passwordResetRequested',
      eventProperties: { url: `${this.options.adminUrl ?? ''}/password/define/${token}` },
    });
  }

  /**
   * Consume an invitation: activates (or creates) the user with the given
   * password and marks the link used. Expired or already-used links are
   * refused without leaking whether the email exists. `name` is optional for
   * an EXISTING account (password-reset flow keeps the current name).
   */
  async acceptInvitation(token: string, input: { name?: string; password: string }): Promise<User> {
    const invitation = await this.repository.findValidInvitation(sha256(token), nowIso());
    if (!invitation) throw new InvitationInvalidError();

    const existing = await this.repository.findUserByEmail(invitation.email);
    const name = input.name?.trim() || existing?.name || invitation.email.split('@')[0] || 'Membre';
    const user = await this.repository.activateUser({
      email: invitation.email,
      name,
      passwordHash: await this.hashPassword(input.password),
      role: invitation.role,
    });
    await this.repository.markInvitationUsed(invitation.id, nowIso());
    return user;
  }

  // ── Users management ───────────────────────────────────────────────────────

  async listUsers(): Promise<User[]> {
    return this.repository.listUsers();
  }

  async getUser(id: string): Promise<User> {
    const user = await this.repository.findUserById(id);
    if (!user) throw new UserNotFoundError(`utilisateur introuvable: ${id}`);
    return user;
  }

  async hasAnyUser(): Promise<boolean> {
    return this.repository.hasAnyUser();
  }

  async removeUser(actorId: string, id: string): Promise<void> {
    if (id === actorId) {
      throw new CannotRemoveSelfError();
    }
    await this.repository.deleteUser(id);
  }

  async updateUser(
    id: string,
    input: { name?: string; role?: 'admin' | 'redacteur'; email?: string },
  ): Promise<User> {
    const updated = await this.repository.updateUser(id, input);
    if (!updated) throw new UserNotFoundError(`utilisateur introuvable: ${id}`);
    return updated;
  }

  // ── API tokens (machine plane) ─────────────────────────────────────────────

  /** The plaintext token is returned ONCE — only its sha256 lands in the database. */
  async createApiToken(name: string): Promise<{ token: string; record: ApiToken }> {
    const token = `commun_${randomBytes(24).toString('base64url')}`;
    const record = await this.repository.insertApiToken({ name, tokenHash: sha256(token) });
    return { token, record };
  }

  /** True if the bearer token matches a non-revoked API token (stamps lastUsedAt). */
  async verifyApiToken(token: string): Promise<boolean> {
    const found = await this.repository.findActiveApiToken(sha256(token));
    if (!found) return false;
    await this.repository.touchApiToken(found.id, nowIso());
    return true;
  }

  async revokeApiToken(id: string): Promise<void> {
    await this.repository.revokeApiToken(id, nowIso());
  }

  async listApiTokens() {
    return this.repository.listApiTokens();
  }
}
