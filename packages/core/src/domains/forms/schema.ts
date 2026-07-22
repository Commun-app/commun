import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createdAt, id, legacyExtra, updatedAt } from '../../infrastructure/db/helpers.ts';

/** Citizen-facing form definitions (contact, signalement, demande d'acte…). */
export const forms = sqliteTable('forms', {
  id: id(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  /** Field definitions — same closed field-type set as collections. */
  fields: text('fields', { mode: 'json' }).$type<unknown[]>().notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  legacyExtra: legacyExtra(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Citizen submissions, visible in the admin. */
export const formSubmissions = sqliteTable('form_submissions', {
  id: id(),
  formId: text('form_id')
    .notNull()
    .references(() => forms.id, { onDelete: 'cascade' }),
  data: text('data', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  status: text('status', { enum: ['new', 'processed'] })
    .notNull()
    .default('new'),
  createdAt: createdAt(),
});

export type Form = typeof forms.$inferSelect;
export type NewForm = typeof forms.$inferInsert;
export type FormSubmission = typeof formSubmissions.$inferSelect;
export type NewFormSubmission = typeof formSubmissions.$inferInsert;
