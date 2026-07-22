import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createdAt, id, updatedAt } from '../../infrastructure/db/helpers.ts';

export const users = sqliteTable('users', {
  id: id(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  /** Null until the invitation is accepted and a password is set. */
  passwordHash: text('password_hash'),
  role: text('role', { enum: ['admin', 'redacteur'] })
    .notNull()
    .default('redacteur'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Opaque server-side sessions (httpOnly cookie carries the id). */
export const sessions = sqliteTable('sessions', {
  id: id(),
  /** Only the hash of the session token is stored. */
  tokenHash: text('token_hash').notNull().unique(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: text('expires_at').notNull(),
  revokedAt: text('revoked_at'),
  createdAt: createdAt(),
});

/** Single-use, time-limited invitations (crypto-random token, stored hashed). */
export const invitations = sqliteTable('invitations', {
  id: id(),
  email: text('email').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  role: text('role', { enum: ['admin', 'redacteur'] })
    .notNull()
    .default('redacteur'),
  expiresAt: text('expires_at').notNull(),
  usedAt: text('used_at'),
  createdAt: createdAt(),
});

/** Machine tokens (site builds) — shown once, stored hashed, revocable, read-only plane. */
export const apiTokens = sqliteTable('api_tokens', {
  id: id(),
  name: text('name').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  lastUsedAt: text('last_used_at'),
  revokedAt: text('revoked_at'),
  createdAt: createdAt(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type ApiToken = typeof apiTokens.$inferSelect;
