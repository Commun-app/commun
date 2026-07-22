import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import {
  createdAt,
  id,
  legacyExtra,
  publicationStatus,
  publishedAt,
  updatedAt,
} from '../../infrastructure/db/helpers.ts';
import { medias } from '../medias/schema.ts';

export const actualites = sqliteTable('actualites', {
  id: id(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  excerpt: text('excerpt'),
  /** Rich text as a portable JSON document (ProseMirror-style). */
  content: text('content', { mode: 'json' }).$type<Record<string, unknown>>(),
  coverMediaId: text('cover_media_id').references(() => medias.id, { onDelete: 'set null' }),
  status: publicationStatus(),
  publishedAt: publishedAt(),
  legacyExtra: legacyExtra(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Actualite = typeof actualites.$inferSelect;
export type NewActualite = typeof actualites.$inferInsert;
