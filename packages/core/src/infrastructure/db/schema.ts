// Drizzle schema of the instance database — THE single source of truth for every
// table; domains re-export their own slice. `drizzle-kit generate` reads this
// file to produce `packages/core/drizzle/`.
//
// Every content table carries a `legacy_extra` JSON column, so nothing is lost
// while migrating off the previous platform.
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { z } from 'zod';

// ── Column helpers ───────────────────────────────────────────────────────────

/** Primary key: a UUID generated at insert time. */
const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

// ISO-8601 with milliseconds and zone. SQLite's own `CURRENT_TIMESTAMP` yields
// another format, hence the application-side defaults.
const createdAt = () =>
  text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString());

const updatedAt = () =>
  text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString())
    .$onUpdateFn(() => new Date().toISOString());

/**
 * Catch-all for legacy attributes with no typed home, filled by the migration
 * CLI so nothing is lost: APIDAE mappings, historical media variants, unmapped
 * attributes and quarantined data.
 */
const legacyExtra = () =>
  text('legacy_extra', { mode: 'json' }).$type<Record<string, unknown> | null>();

import { PUBLICATION_STATUSES } from '../../domains/collections/constants.ts';
import type { FieldDefinition } from '../../domains/collections/utils.ts';

export {
  PUBLICATION_STATUSES,
  FIELD_TYPES,
  type FieldType,
} from '../../domains/collections/constants.ts';
export { fieldDefinitionSchema, type FieldDefinition } from '../../domains/collections/utils.ts';
const publicationStatus = () =>
  text('status', { enum: PUBLICATION_STATUSES }).notNull().default('draft');

/**
 * Timestamp of the last publication, rewritten on every transition. It plays NO
 * scheduling role — the public plane filters on status alone.
 */
const publishedAt = () => text('published_at');

// ── Organization (singleton) ─────────────────────────────────────────────────

/** Postal address, as a typed JSON field. */
export const addressSchema = z.object({
  street: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
});
export type Address = z.infer<typeof addressSchema>;

/**
 * Instance settings — a singleton row (id = 1, enforced by the queries).
 * Single-tenant by design: one instance = one local authority; no table
 * anywhere carries a tenant key.
 */
export const organization = sqliteTable('organization', {
  id: integer('id').primaryKey().default(1),
  name: text('name').notNull(),
  type: text('type', { enum: ['commune', 'intercommunality', 'syndicate', 'other'] })
    .notNull()
    .default('commune'),
  /** Readable identifier, used in admin routes and hosted subdomains. */
  slug: text('slug').notNull(),
  description: text('description'),
  address: text('address', { mode: 'json' }).$type<Address>(),
  /**
   * Deployment payload served on `/api/v1/content/deployment` — the `_theme`
   * and `_pages` current site builds consume. Superseded by the theme layer.
   */
  deployment: text('deployment', { mode: 'json' }).$type<Record<string, unknown>>(),
  /** Instance settings: logo, support reference… */
  settings: text('settings', { mode: 'json' }).$type<Record<string, unknown>>(),
  updatedBy: text('updated_by'),
  legacyExtra: legacyExtra(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Organization = typeof organization.$inferSelect;
export type NewOrganization = typeof organization.$inferInsert;

// ── Users, sessions, invitations, API tokens ─────────────────────────────────

export const users = sqliteTable('users', {
  id: id(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  /** Null until the invitation is accepted and a password is set (argon2id). */
  passwordHash: text('password_hash'),
  role: text('role', { enum: ['admin', 'redacteur'] })
    .notNull()
    .default('redacteur'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/**
 * Server-side sessions. The client carries a signed JWT holding `{ session }`,
 * but revocation lives HERE: a valid JWT whose row is revoked is refused.
 */
export const sessions = sqliteTable('sessions', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: text('expires_at').notNull(),
  revokedAt: text('revoked_at'),
  // Device metadata — the account page lists them.
  ua: text('ua'),
  ip: text('ip'),
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

/** Machine tokens for site builds — shown once, stored hashed, revocable. */
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

// ── Media ────────────────────────────────────────────────────────────────────

// No storage-driver column: object storage is the only backend.
export const media = sqliteTable('media', {
  id: id(),
  filename: text('filename').notNull(),
  mime: text('mime').notNull(),
  size: integer('size').notNull(),
  alt: text('alt'),
  caption: text('caption'),
  /** Storage keys: `{ original: string, variants: { [name]: string } }`. */
  objects: text('objects', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  metaData: text('meta_data', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  legacyExtra: legacyExtra(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;

// ── Collections (content engine) ─────────────────────────────────────────────
/** Collection definitions — the primary content model of Commun. */
export const collectionDefinitions = sqliteTable('collection_definitions', {
  id: id(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  fields: text('fields', { mode: 'json' }).$type<FieldDefinition[]>().notNull(),
  // Admin form layout, list display and page headings.
  editor: text('editor', { mode: 'json' }).$type<Record<string, unknown>>(),
  display: text('display', { mode: 'json' }).$type<Record<string, unknown>>(),
  headings: text('headings', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  legacyExtra: legacyExtra(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Entries of a collection — validated against the definition's fields. */
export const entries = sqliteTable(
  'entries',
  {
    id: id(),
    collectionId: text('collection_id')
      .notNull()
      .references(() => collectionDefinitions.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    data: text('data', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
    /** Reverse relations: ids of the entries referencing this one. */
    related: text('related', { mode: 'json' }).$type<string[]>(),
    createdBy: text('created_by'),
    updatedBy: text('updated_by'),
    status: publicationStatus(),
    publishedAt: publishedAt(),
    legacyExtra: legacyExtra(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  // Slugs are route segments on the published site — unique per collection.
  (table) => [uniqueIndex('entries_slug_unique').on(table.collectionId, table.slug)],
);

export type CollectionDefinition = typeof collectionDefinitions.$inferSelect;
export type NewCollectionDefinition = typeof collectionDefinitions.$inferInsert;
export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
