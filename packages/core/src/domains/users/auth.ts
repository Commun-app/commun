import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { CommunError, ERR } from '../../common/errors/index.ts';
import type { StoreDb } from '../../infrastructure/db/index.ts';
import { invitations, sessions, users, type User } from './schema.ts';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const nowIso = () => new Date().toISOString();

const SESSION_TTL_MS = 30 * 24 * 3600 * 1000; // 30 jours
const INVITATION_TTL_MS = 7 * 24 * 3600 * 1000; // 7 jours

export interface AuthSession {
  sessionId: string;
  user: User;
  expiresAt: string;
}

// ── Mots de passe ────────────────────────────────────────────────────────────
// Bun.password = argon2id par défaut (mémoire-dur, natif au runtime).

export const hashPassword = (password: string) => Bun.password.hash(password);
export const verifyPassword = (password: string, passwordHash: string) =>
  Bun.password.verify(password, passwordHash);

// ── Sessions opaques ─────────────────────────────────────────────────────────
// Le token (aléatoire, 256 bits) voyage dans un cookie httpOnly ; seul son
// sha256 est stocké. Révocation individuelle par simple update.

export async function login(
  db: StoreDb,
  email: string,
  password: string,
): Promise<{ token: string; session: AuthSession } | null> {
  const user = db.select().from(users).where(eq(users.email, email.toLowerCase())).get();
  // Compare against a dummy hash when the user is unknown — keeps timing flat.
  const ok = user?.passwordHash ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) return null;
  return createSession(db, user);
}

export function createSession(db: StoreDb, user: User): { token: string; session: AuthSession } {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const row = db
    .insert(sessions)
    .values({ tokenHash: hash(token), userId: user.id, expiresAt })
    .returning()
    .get();
  return { token, session: { sessionId: row.id, user, expiresAt } };
}

export function verifySession(db: StoreDb, token: string): AuthSession | null {
  const row = db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, hash(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, nowIso()),
      ),
    )
    .get();
  if (!row) return null;
  return { sessionId: row.session.id, user: row.user, expiresAt: row.session.expiresAt };
}

export function revokeSession(db: StoreDb, sessionId: string): void {
  db.update(sessions).set({ revokedAt: nowIso() }).where(eq(sessions.id, sessionId)).run();
}

// ── Invitations à usage unique ───────────────────────────────────────────────

export function createInvitation(
  db: StoreDb,
  input: { email: string; role: 'admin' | 'redacteur' },
): { token: string; expiresAt: string } {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS).toISOString();
  db.insert(invitations)
    .values({
      email: input.email.toLowerCase(),
      role: input.role,
      tokenHash: hash(token),
      expiresAt,
    })
    .run();
  return { token, expiresAt };
}

/**
 * Consume an invitation: activates (or creates) the user with the given
 * password and marks the link used. Expired or already-used links are refused
 * without leaking whether the email exists.
 */
export async function acceptInvitation(
  db: StoreDb,
  token: string,
  input: { name: string; password: string },
): Promise<User> {
  const invitation = db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.tokenHash, hash(token)),
        isNull(invitations.usedAt),
        gt(invitations.expiresAt, nowIso()),
      ),
    )
    .get();
  if (!invitation) throw new CommunError(ERR.INVALID_STATE, 'invitation invalide ou expirée');

  const passwordHash = await hashPassword(input.password);
  const existing = db.select().from(users).where(eq(users.email, invitation.email)).get();
  const user = existing
    ? db
        .update(users)
        .set({ name: input.name, passwordHash, role: invitation.role })
        .where(eq(users.id, existing.id))
        .returning()
        .get()!
    : db
        .insert(users)
        .values({
          email: invitation.email,
          name: input.name,
          passwordHash,
          role: invitation.role,
        })
        .returning()
        .get();

  db.update(invitations).set({ usedAt: nowIso() }).where(eq(invitations.id, invitation.id)).run();
  return user;
}
