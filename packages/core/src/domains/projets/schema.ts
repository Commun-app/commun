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

export const projets = sqliteTable('projets', {
  id: id(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  excerpt: text('excerpt'),
  content: text('content', { mode: 'json' }).$type<Record<string, unknown>>(),
  /** Avancement du projet municipal, indépendant du cycle de publication. */
  etat: text('etat', { enum: ['etude', 'en-cours', 'termine'] })
    .notNull()
    .default('etude'),
  startAt: text('start_at'),
  endAt: text('end_at'),
  coverMediaId: text('cover_media_id').references(() => medias.id, { onDelete: 'set null' }),
  status: publicationStatus(),
  publishedAt: publishedAt(),
  legacyExtra: legacyExtra(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Projet = typeof projets.$inferSelect;
export type NewProjet = typeof projets.$inferInsert;
