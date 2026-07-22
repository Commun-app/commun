import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import {
  createdAt,
  id,
  legacyExtra,
  publicationStatus,
  publishedAt,
  updatedAt,
} from '../../infrastructure/db/helpers.ts';

/**
 * Collection definitions — the primary content model of Commun (sanitised
 * heir of the legacy `attributes/editor/display` engine). Standard content
 * (news, events, officials, projects) ships as seeded collections via a
 * Drizzle migration; communes extend freely. Field types come from a CLOSED
 * set (validated by the domain's Zod schemas): text, rich-text, number,
 * boolean, date, media, relation, select.
 */
export const collectionDefinitions = sqliteTable('collection_definitions', {
  id: id(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  fields: text('fields', { mode: 'json' }).$type<unknown[]>().notNull(),
  legacyExtra: legacyExtra(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Entries of a custom collection — validated against the definition's fields. */
export const collectionEntries = sqliteTable('collection_entries', {
  id: id(),
  collectionId: text('collection_id')
    .notNull()
    .references(() => collectionDefinitions.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  data: text('data', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  status: publicationStatus(),
  publishedAt: publishedAt(),
  legacyExtra: legacyExtra(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type CollectionDefinition = typeof collectionDefinitions.$inferSelect;
export type NewCollectionDefinition = typeof collectionDefinitions.$inferInsert;
export type CollectionEntry = typeof collectionEntries.$inferSelect;
export type NewCollectionEntry = typeof collectionEntries.$inferInsert;
