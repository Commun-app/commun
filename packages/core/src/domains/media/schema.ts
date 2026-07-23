import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createdAt, id, legacyExtra, updatedAt } from '../../infrastructure/db/helpers.ts';

// No storage-driver column: S3 is the only backend (review 2026-07-23).
export const media = sqliteTable('media', {
  id: id(),
  filename: text('filename').notNull(),
  mime: text('mime').notNull(),
  size: integer('size').notNull(),
  alt: text('alt'),
  caption: text('caption'),
  /**
   * Storage keys: `{ original: string, variants: { [name]: string } }` —
   * webp variants arrive with the real resize implementation (end of phase).
   */
  objects: text('objects', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  metaData: text('meta_data', { mode: 'json' }).$type<Record<string, unknown>>(),
  legacyExtra: legacyExtra(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
