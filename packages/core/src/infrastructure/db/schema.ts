// Drizzle schema of the single-tenant instance database — THE single source
// of truth for every table (revue PR #1, 28/07 : schéma regroupé ici plutôt
// que dispersé dans les domaines ; les domaines re-exportent leur tranche).
// `drizzle-kit generate` lit ce fichier pour produire `packages/core/drizzle/`.
//
// Phase 1 reproduces the legacy platform iso-functionally: every content
// table carries a `legacy_extra` JSON column so nothing is lost when
// migrating from the legacy Mongo platform.
import { and, eq, isNull, lte, or, type SQL } from 'drizzle-orm';
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  type SQLiteColumn,
} from 'drizzle-orm/sqlite-core';
import { z } from 'zod';

// ── Column helpers ───────────────────────────────────────────────────────────

/** Primary key: UUID (natif, zéro dépendance), generated at insert time. */
const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

// ISO-8601 avec millisecondes et fuseau (iso legacy JSON) — les défauts SQL
// de SQLite (`CURRENT_TIMESTAMP`) produisent un autre format, d'où les
// défauts applicatifs.
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
 * Catch-all des attributs legacy sans destination typée — rempli par la CLI
 * de migration pour ne rien perdre : config `injector` (mappings APIDAE) sur
 * l'organisation, variantes webp historiques sur les médias, attributs non
 * mappés et quarantaine `_invalidData` sur les entrées.
 */
const legacyExtra = () =>
  text('legacy_extra', { mode: 'json' }).$type<Record<string, unknown> | null>();

/**
 * Publication lifecycle shared by every publishable content table — iso legacy
 * (record.constants) : le flux éditorial draft → waiting → ready → published
 * est piloté par l'admin ; seul `published` est servi sur le plan public.
 */
export const PUBLICATION_STATUSES = [
  'draft',
  'waiting',
  'ready',
  'scheduled',
  'published',
] as const;
const publicationStatus = () =>
  text('status', { enum: PUBLICATION_STATUSES }).notNull().default('draft');

/** ISO timestamp de bascule en `published` — futur = publication programmée. */
const publishedAt = () => text('published_at');

/**
 * WHERE clause of the public plane: status=published AND (publishedAt unset OR
 * past). Shared by every publishable domain — scheduled items stay hidden.
 */
export const publishedWhere = (
  table: { status: SQLiteColumn; publishedAt: SQLiteColumn },
  now: string = new Date().toISOString(),
): SQL =>
  and(eq(table.status, 'published'), or(isNull(table.publishedAt), lte(table.publishedAt, now)))!;

// ── Organization (singleton single-tenant) ───────────────────────────────────

/** Adresse postale de la collectivité — un champ JSON typé (revue 28/07). */
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
  /** Identifiant lisible — routes de l'admin, sous-domaine SaaS (`slug.commun.app`). */
  slug: text('slug').notNull(),
  description: text('description'),
  address: text('address', { mode: 'json' }).$type<Address>(),
  /**
   * Legacy deployment payload served ISO on `/api/v1/content/deployment`
   * (`theme` + `definition` = the `_theme`/`_pages` the current site builds
   * consume). Superseded by the phase-5 theme layer, kept for the cutover.
   */
  deployment: text('deployment', { mode: 'json' }).$type<Record<string, unknown>>(),
  /** Réglages d'instance (iso legacy `organization.settings` : logo, ticketRef…). */
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
 * Sessions serveur — le client porte un JWT signé contenant { session: <id> }
 * (décision Quentin 28/07) ; la révocation reste EN BASE : un JWT valide dont
 * la ligne est révoquée/expirée est refusé.
 */
export const sessions = sqliteTable('sessions', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: text('expires_at').notNull(),
  revokedAt: text('revoked_at'),
  // Device metadata (iso legacy: the account page lists devices).
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

/** Machine tokens (site builds) — shown once, stored hashed, revocable. */
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

// No storage-driver column: S3 is the only backend (review 2026-07-23).
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
// The CLOSED set of field types available to collections. Extending this set
// is a spec-level decision — arbitrary field types are exactly the legacy
// JSON free-for-all this design replaces.

export const FIELD_TYPES = [
  'text',
  'rich-text',
  'number',
  'boolean',
  'date',
  'media',
  'relation',
  'select',
  // Iso legacy `array-of-steps`: ordered steps whose content is rich text.
  'steps',
  // Iso legacy raw JSON attributes (location, socials, schedules…): served as-is.
  'json',
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const fieldDefinitionSchema = z
  .object({
    /** Machine name of the field inside `data` (casse préservée iso legacy). */
    name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'nom de champ invalide'),
    label: z.string().min(1),
    type: z.enum(FIELD_TYPES),
    required: z.boolean().default(false),
    /** Hidden fields are editable in the admin but EXCLUDED from public payloads. */
    hidden: z.boolean().default(false),
    /** Choices — required for `select`. */
    options: z.array(z.string().min(1)).optional(),
    /** Target collection slug — required for `relation`. */
    target: z.string().optional(),
  })
  .check((ctx) => {
    if (ctx.value.type === 'select' && !ctx.value.options?.length) {
      ctx.issues.push({
        code: 'custom',
        message: 'options requises pour un champ select',
        input: ctx.value,
      });
    }
    if (ctx.value.type === 'relation' && !ctx.value.target) {
      ctx.issues.push({
        code: 'custom',
        message: 'target requis pour un champ relation',
        input: ctx.value,
      });
    }
  });

export type FieldDefinition = z.infer<typeof fieldDefinitionSchema>;

/** Collection definitions — the primary content model of Commun. */
export const collectionDefinitions = sqliteTable('collection_definitions', {
  id: id(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  fields: text('fields', { mode: 'json' }).$type<FieldDefinition[]>().notNull(),
  // Iso legacy Collection model: admin form layout, list display and page headings.
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
    /** Reverse relations (iso legacy `records[]`): ids of entries referencing this one. */
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
