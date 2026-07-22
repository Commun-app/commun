import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createdAt, id, legacyExtra, updatedAt } from '../../infrastructure/db/helpers.ts';

export const media = sqliteTable('media', {
  id: id(),
  filename: text('filename').notNull(),
  mime: text('mime').notNull(),
  size: integer('size').notNull(),
  alt: text('alt'),
  caption: text('caption'),
  /** Storage driver that holds the objects. */
  driver: text('driver', { enum: ['local', 's3'] }).notNull(),
  /**
   * Storage keys: `{ original: string, variants: { [name]: string } }` —
   * webp variants are generated asynchronously after upload.
   */
  objects: text('objects', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  metaData: text('meta_data', { mode: 'json' }).$type<Record<string, unknown>>(),
  legacyExtra: legacyExtra(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
