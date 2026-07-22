import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import {
  createdAt,
  id,
  legacyExtra,
  publicationStatus,
  publishedAt,
  updatedAt,
} from '../../infrastructure/db/helpers.ts';
import { medias } from '../medias/schema.ts';

export const elus = sqliteTable('elus', {
  id: id(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  /** Fonction : maire, adjoint(e), conseiller(ère)… */
  fonction: text('fonction'),
  delegation: text('delegation'),
  bio: text('bio', { mode: 'json' }).$type<Record<string, unknown>>(),
  email: text('email'),
  photoMediaId: text('photo_media_id').references(() => medias.id, { onDelete: 'set null' }),
  /** Display order in the directory. */
  sortOrder: integer('sort_order').notNull().default(0),
  status: publicationStatus(),
  publishedAt: publishedAt(),
  legacyExtra: legacyExtra(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Elu = typeof elus.$inferSelect;
export type NewElu = typeof elus.$inferInsert;
