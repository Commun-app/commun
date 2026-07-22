import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createdAt, legacyExtra, updatedAt } from '../../infrastructure/db/helpers.ts';

/**
 * Instance settings — a singleton row (id = 1, enforced by the queries).
 * Single-tenant by design: no table anywhere carries an organisation key.
 */
export const collectivite = sqliteTable('collectivite', {
  id: integer('id').primaryKey().default(1),
  name: text('name').notNull(),
  /** commune | communaute-de-communes | syndicat | autre */
  type: text('type', { enum: ['commune', 'communaute-de-communes', 'syndicat', 'autre'] })
    .notNull()
    .default('commune'),
  slug: text('slug').notNull(),
  description: text('description'),
  address: text('address'),
  postalCode: text('postal_code'),
  city: text('city'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  /** Visual identity consumed by the site build: colors, fonts, logo media id… */
  theme: text('theme', { mode: 'json' }).$type<Record<string, unknown>>(),
  /** Social network links, keyed by network name. */
  social: text('social', { mode: 'json' }).$type<Record<string, string>>(),
  legacyExtra: legacyExtra(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Collectivite = typeof collectivite.$inferSelect;
export type NewCollectivite = typeof collectivite.$inferInsert;
