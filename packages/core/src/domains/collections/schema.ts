import { sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { z } from 'zod';
import {
  createdAt,
  id,
  legacyExtra,
  publicationStatus,
  publishedAt,
  updatedAt,
} from '../../infrastructure/db/helpers.ts';

// ── Field model ──────────────────────────────────────────────────────────────
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
    /** Machine name of the field inside `data`. */
    // Casse preservée iso legacy (directParent, paymentMethods…).
    name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'nom de champ invalide'),
    label: z.string().min(1),
    type: z.enum(FIELD_TYPES),
    required: z.boolean().default(false),
    /** Hidden fields are editable in the admin but EXCLUDED from public payloads (iso legacy `options.hidden`). */
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

// ── Tables ───────────────────────────────────────────────────────────────────

/**
 * Collection definitions — the primary content model of Commun (sanitised
 * heir of the legacy `attributes/editor/display` engine). Standard content
 * (news, events, officials, projects) ships as seeded collections via a
 * Drizzle migration; communes extend freely.
 */
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
    /** Reverse relations (iso legacy `records[]`): ids of entries that reference this one. */
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
