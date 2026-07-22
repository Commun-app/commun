import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createdAt, id, legacyExtra, updatedAt } from '../../infrastructure/db/helpers.ts';

/** Citizen-facing form definitions (contact, signalement, demande d'acte…). */
export const formulaires = sqliteTable('formulaires', {
  id: id(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  /** Field definitions — same closed field-type set as custom collections. */
  fields: text('fields', { mode: 'json' }).$type<unknown[]>().notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  legacyExtra: legacyExtra(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Citizen submissions, visible in the admin. */
export const soumissions = sqliteTable('soumissions', {
  id: id(),
  formulaireId: text('formulaire_id')
    .notNull()
    .references(() => formulaires.id, { onDelete: 'cascade' }),
  data: text('data', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  status: text('status', { enum: ['nouvelle', 'traitee'] })
    .notNull()
    .default('nouvelle'),
  createdAt: createdAt(),
});

export type Formulaire = typeof formulaires.$inferSelect;
export type NewFormulaire = typeof formulaires.$inferInsert;
export type Soumission = typeof soumissions.$inferSelect;
export type NewSoumission = typeof soumissions.$inferInsert;
