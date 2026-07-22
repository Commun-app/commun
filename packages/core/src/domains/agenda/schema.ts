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

export const evenements = sqliteTable('evenements', {
  id: id(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  excerpt: text('excerpt'),
  content: text('content', { mode: 'json' }).$type<Record<string, unknown>>(),
  startAt: text('start_at').notNull(),
  endAt: text('end_at'),
  /** Venue: label, address, lat/lng… */
  location: text('location', { mode: 'json' }).$type<Record<string, unknown>>(),
  coverMediaId: text('cover_media_id').references(() => medias.id, { onDelete: 'set null' }),
  status: publicationStatus(),
  publishedAt: publishedAt(),
  legacyExtra: legacyExtra(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Evenement = typeof evenements.$inferSelect;
export type NewEvenement = typeof evenements.$inferInsert;
