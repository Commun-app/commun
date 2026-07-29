import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { entries } from '../schema.ts';

// System columns are never accepted from the outside; `data` is validated
// separately against the definition's generated schema (see service.ts).
// `related` and audit columns are system-managed.
const OMIT = {
  id: true,
  createdAt: true,
  updatedAt: true,
  legacyExtra: true,
  related: true,
  createdBy: true,
  updatedBy: true,
} as const;

// Slug optional — iso legacy: généré depuis le titre (slugify fr) + suffixe incrémental.
export const entryCreateDto = createInsertSchema(entries)
  .omit(OMIT)
  .omit({ collectionId: true })
  .extend({ slug: z.string().optional() });

// `related` est ré-ouvert à l'UPDATE uniquement : les liens libres entre
// entrées (iso legacy `records[]`, onglet Relations de l'admin) sont édités
// directement — le serveur maintient la symétrie (voir service.updateEntry).
export const entryUpdateDto = createUpdateSchema(entries)
  .omit(OMIT)
  .omit({ collectionId: true })
  .extend({ related: z.array(z.string()).optional() });

export type EntryCreateDto = z.infer<typeof entryCreateDto>;
export type EntryUpdateDto = z.infer<typeof entryUpdateDto>;
