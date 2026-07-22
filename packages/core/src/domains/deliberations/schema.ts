import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import {
  createdAt,
  id,
  legacyExtra,
  publicationStatus,
  publishedAt,
  updatedAt,
} from '../../infrastructure/db/helpers.ts';
import { media } from '../media/schema.ts';

// Deliberations keep a TYPED schema on purpose (design D6 rev. 2): structured
// vote counts, the séance→délibération relation and the AI transcription
// module (phase 5) all need guarantees a generic collection cannot give.
// `council_sessions` — not `sessions`, which is taken by auth.

/** Council meeting (conseil municipal, conseil communautaire…). */
export const councilSessions = sqliteTable('council_sessions', {
  id: id(),
  title: text('title').notNull(),
  date: text('date').notNull(),
  /** Ordre du jour (rich text). */
  agenda: text('agenda', { mode: 'json' }).$type<Record<string, unknown>>(),
  /** Compte-rendu (rich text) — later fed by the AI transcription module. */
  minutes: text('minutes', { mode: 'json' }).$type<Record<string, unknown>>(),
  status: publicationStatus(),
  publishedAt: publishedAt(),
  legacyExtra: legacyExtra(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Deliberation of a council session, publishable individually. */
export const deliberations = sqliteTable('deliberations', {
  id: id(),
  sessionId: text('session_id')
    .notNull()
    .references(() => councilSessions.id, { onDelete: 'cascade' }),
  number: text('number').notNull(),
  subject: text('subject').notNull(),
  content: text('content', { mode: 'json' }).$type<Record<string, unknown>>(),
  votesFor: integer('votes_for'),
  votesAgainst: integer('votes_against'),
  abstentions: integer('abstentions'),
  outcome: text('outcome', { enum: ['adopted', 'rejected', 'postponed'] }),
  /** Official PDF attachment. */
  fileMediaId: text('file_media_id').references(() => media.id, { onDelete: 'set null' }),
  status: publicationStatus(),
  publishedAt: publishedAt(),
  legacyExtra: legacyExtra(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type CouncilSession = typeof councilSessions.$inferSelect;
export type NewCouncilSession = typeof councilSessions.$inferInsert;
export type Deliberation = typeof deliberations.$inferSelect;
export type NewDeliberation = typeof deliberations.$inferInsert;
