import { and, desc, eq, gt, isNotNull, isNull, lt, or } from 'drizzle-orm';
import type { StoreDb } from '../../infrastructure/db/index.ts';
import {
  apiTokens,
  invitations,
  sessions,
  users,
  type ApiToken,
  type Invitation,
  type Session,
  type User,
} from './schema.ts';

/** All database access of the users domain — services never touch Drizzle directly. */
export class UsersRepository {
  constructor(private readonly db: StoreDb) {}

  // ── Users ──────────────────────────────────────────────────────────────────

  findUserByEmail(email: string): User | undefined {
    return this.db.select().from(users).where(eq(users.email, email)).get();
  }

  listUsers(): User[] {
    return this.db.select().from(users).all();
  }

  hasAnyUser(): boolean {
    return this.db.select({ id: users.id }).from(users).limit(1).all().length > 0;
  }

  deleteUser(id: string): void {
    this.db.delete(users).where(eq(users.id, id)).run();
  }

  activateUser(input: {
    email: string;
    name: string;
    passwordHash: string;
    role: 'admin' | 'redacteur';
  }): User {
    const existing = this.findUserByEmail(input.email);
    if (existing) {
      return this.db
        .update(users)
        .set({ name: input.name, passwordHash: input.passwordHash, role: input.role })
        .where(eq(users.id, existing.id))
        .returning()
        .get()!;
    }
    return this.db.insert(users).values(input).returning().get();
  }

  // ── Sessions ───────────────────────────────────────────────────────────────

  insertSession(input: { tokenHash: string; userId: string; expiresAt: string }): Session {
    return this.db.insert(sessions).values(input).returning().get();
  }

  findActiveSessionWithUser(tokenHash: string, now: string): { session: Session; user: User } | undefined {
    return this.db
      .select({ session: sessions, user: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt), gt(sessions.expiresAt, now)),
      )
      .get();
  }

  revokeSession(sessionId: string, now: string): void {
    this.db.update(sessions).set({ revokedAt: now }).where(eq(sessions.id, sessionId)).run();
  }

  findSessionById(sessionId: string): Session | undefined {
    return this.db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
  }

  listActiveSessionsByUser(userId: string, now: string): Session[] {
    return this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt), gt(sessions.expiresAt, now)))
      .orderBy(desc(sessions.createdAt))
      .all();
  }

  updateUser(id: string, input: Partial<Pick<User, 'name' | 'role'>>): User | undefined {
    return this.db.update(users).set(input).where(eq(users.id, id)).returning().get();
  }

  // ── Invitations ────────────────────────────────────────────────────────────

  insertInvitation(input: {
    email: string;
    role: 'admin' | 'redacteur';
    tokenHash: string;
    expiresAt: string;
  }): Invitation {
    return this.db.insert(invitations).values(input).returning().get();
  }

  findValidInvitation(tokenHash: string, now: string): Invitation | undefined {
    return this.db
      .select()
      .from(invitations)
      .where(
        and(eq(invitations.tokenHash, tokenHash), isNull(invitations.usedAt), gt(invitations.expiresAt, now)),
      )
      .get();
  }

  markInvitationUsed(id: string, now: string): void {
    this.db.update(invitations).set({ usedAt: now }).where(eq(invitations.id, id)).run();
  }

  // ── API tokens ─────────────────────────────────────────────────────────────

  insertApiToken(input: { name: string; tokenHash: string }): ApiToken {
    return this.db.insert(apiTokens).values(input).returning().get();
  }

  findActiveApiToken(tokenHash: string): ApiToken | undefined {
    return this.db
      .select()
      .from(apiTokens)
      .where(and(eq(apiTokens.tokenHash, tokenHash), isNull(apiTokens.revokedAt)))
      .get();
  }

  touchApiToken(id: string, now: string): void {
    this.db.update(apiTokens).set({ lastUsedAt: now }).where(eq(apiTokens.id, id)).run();
  }

  revokeApiToken(id: string, now: string): void {
    this.db.update(apiTokens).set({ revokedAt: now }).where(eq(apiTokens.id, id)).run();
  }

  listApiTokens(): Array<Pick<ApiToken, 'id' | 'name' | 'lastUsedAt' | 'revokedAt' | 'createdAt'>> {
    return this.db
      .select({
        id: apiTokens.id,
        name: apiTokens.name,
        lastUsedAt: apiTokens.lastUsedAt,
        revokedAt: apiTokens.revokedAt,
        createdAt: apiTokens.createdAt,
      })
      .from(apiTokens)
      .orderBy(desc(apiTokens.createdAt))
      .all();
  }

  // ── Housekeeping ───────────────────────────────────────────────────────────

  purgeExpired(now: string): void {
    this.db.delete(sessions).where(or(lt(sessions.expiresAt, now), isNotNull(sessions.revokedAt))).run();
    this.db
      .delete(invitations)
      .where(or(lt(invitations.expiresAt, now), isNotNull(invitations.usedAt)))
      .run();
  }
}
