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

/** Séance du conseil (municipal, communautaire…). */
export const seances = sqliteTable('seances', {
  id: id(),
  title: text('title').notNull(),
  date: text('date').notNull(),
  /** Ordre du jour (rich text). */
  ordreDuJour: text('ordre_du_jour', { mode: 'json' }).$type<Record<string, unknown>>(),
  /** Compte-rendu (rich text) — later fed by the AI transcription module. */
  compteRendu: text('compte_rendu', { mode: 'json' }).$type<Record<string, unknown>>(),
  status: publicationStatus(),
  publishedAt: publishedAt(),
  legacyExtra: legacyExtra(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Délibération d'une séance, publiable individuellement. */
export const deliberations = sqliteTable('deliberations', {
  id: id(),
  seanceId: text('seance_id')
    .notNull()
    .references(() => seances.id, { onDelete: 'cascade' }),
  numero: text('numero').notNull(),
  objet: text('objet').notNull(),
  content: text('content', { mode: 'json' }).$type<Record<string, unknown>>(),
  /** Résultat du vote. */
  votePour: integer('vote_pour'),
  voteContre: integer('vote_contre'),
  voteAbstention: integer('vote_abstention'),
  resultat: text('resultat', { enum: ['adoptee', 'rejetee', 'ajournee'] }),
  /** PDF officiel joint. */
  fichierMediaId: text('fichier_media_id').references(() => medias.id, { onDelete: 'set null' }),
  status: publicationStatus(),
  publishedAt: publishedAt(),
  legacyExtra: legacyExtra(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Seance = typeof seances.$inferSelect;
export type NewSeance = typeof seances.$inferInsert;
export type Deliberation = typeof deliberations.$inferSelect;
export type NewDeliberation = typeof deliberations.$inferInsert;
