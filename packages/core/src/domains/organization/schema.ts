import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createdAt, legacyExtra, updatedAt } from '../../infrastructure/db/helpers.ts';

/**
 * Instance settings — a singleton row (id = 1, enforced by the queries).
 * Single-tenant by design: one instance = one local authority (commune,
 * intercommunality, …); no table anywhere carries a tenant key.
 */
export const organization = sqliteTable('organization', {
  id: integer('id').primaryKey().default(1),
  name: text('name').notNull(),
  type: text('type', { enum: ['commune', 'intercommunality', 'syndicate', 'other'] })
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

export type Organization = typeof organization.$inferSelect;
export type NewOrganization = typeof organization.$inferInsert;
