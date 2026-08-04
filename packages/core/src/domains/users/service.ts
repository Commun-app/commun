import { createHash, randomBytes } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { consola } from 'consola';
import {
  CannotRemoveSelfError,
  InvitationInvalidError,
  SessionNotFoundError,
  TooManyAttemptsError,
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

/**
 * Freinage des tentatives de connexion, PAR COMPTE.
 *
 * La limitation générique avait été retirée de l'application (décision Quentin
 * 27/07 : c'est le rôle du reverse proxy). Ce cas-ci est différent et ne peut
 * pas y être traité : le proxy ne lit pas le corps de la requête, donc il ne
 * sait pas QUEL compte est visé. Il plafonne une adresse — utile contre un
 * client isolé, inopérant contre une attaque distribuée qui vise un compte
 * précis depuis mille adresses. C'est le compte qu'on protège ici ; le proxy
 * reste libre de plafonner les adresses par-dessus.
 *
 * En mémoire, donc par processus : suffisant pour une instance par client, et
 * cohérent avec le fait qu'un redémarrage remet naturellement les compteurs à
 * zéro. Une attaque qui survit à ça relève du proxy, pas d'ici.
 */
const LOGIN_WINDOW_MS = 5 * 60_000;
const LOGIN_MAX_FAILURES = 10;
const loginFailures = new Map<string, number[]>();

const recentFailures = (email: string): number[] => {
  const now = Date.now();
  const recent = (loginFailures.get(email) ?? []).filter((at) => now - at < LOGIN_WINDOW_MS);
  if (recent.length) loginFailures.set(email, recent);
  else loginFailures.delete(email);
  return recent;
};

const tooManyAttempts = (email: string) => recentFailures(email).length >= LOGIN_MAX_FAILURES;

const recordFailure = (email: string) => {
  loginFailures.set(email, [...recentFailures(email), Date.now()]);
};

// Une connexion réussie efface l'ardoise : l'utilisateur qui retrouve son mot
// de passe après quelques essais ne doit pas rester pénalisé.
const clearAttempts = (email: string) => loginFailures.delete(email);

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
    private readonly options: { email?: EmailService; adminUrl?: string; jwtSecret?: string } = {},
  ) {}

  /** Clé HMAC du JWT de session (décision 28/07 : JWT { session: <uuid> }). */
  private jwtKey(): Uint8Array {
    if (!this.options.jwtSecret) {
      throw new Error(
        'COMMUN_JWT_SECRET manquant — requis pour signer les sessions (fail-fast au boot)',
      );
    }
    return new TextEncoder().encode(this.options.jwtSecret);
  }

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
    const normalized = email.toLowerCase();
    if (tooManyAttempts(normalized)) throw new TooManyAttemptsError();

    const user = await this.repository.findUserByEmail(normalized);
    // Always run one argon2 verification — unknown emails cost the same as known ones.
    const verified = await this.verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user?.passwordHash || !verified) {
      recordFailure(normalized);
      return null;
    }
    clearAttempts(normalized);
    return this.createSession(user, meta);
  }

  async createSession(
    user: User,
    meta?: SessionMeta,
  ): Promise<{ token: string; session: AuthSession }> {
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    const row = await this.repository.insertSession({
      userId: user.id,
      expiresAt,
      ua: meta?.ua ?? null,
      ip: meta?.ip ?? null,
    });
    // JWT { session: <uuid> } signé HS256 (décision Quentin 28/07) — la
    // révocation reste en base : le JWT n'est qu'un pointeur authentifié.
    const token = await new SignJWT({ session: row.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(new Date(expiresAt))
      .sign(this.jwtKey());
    return { token, session: { sessionId: row.id, user, expiresAt } };
  }

  async verifySession(token: string): Promise<AuthSession | null> {
    let sessionId: string;
    try {
      const { payload } = await jwtVerify(token, this.jwtKey());
      if (typeof payload.session !== 'string') return null;
      sessionId = payload.session;
    } catch {
      return null; // signature invalide, JWT expiré ou malformé
    }
    const row = await this.repository.findActiveSessionWithUser(sessionId, nowIso());
    if (!row) return null; // session révoquée ou expirée en base
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
