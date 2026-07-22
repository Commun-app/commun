import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { fieldDefinitionSchema } from './fields.ts';
import { collectionDefinitions, collectionEntries } from './schema.ts';

const OMIT = { id: true, createdAt: true, updatedAt: true, legacyExtra: true } as const;

export const collectionDefinitionCreateSchema = createInsertSchema(collectionDefinitions)
  .omit(OMIT)
  .extend({ fields: z.array(fieldDefinitionSchema).min(1) });

export const collectionDefinitionUpdateSchema = createUpdateSchema(collectionDefinitions)
  .omit(OMIT)
  .extend({ fields: z.array(fieldDefinitionSchema).min(1).optional() });

// `data` is validated separately against the definition's generated schema
// (see queries.ts) — it cannot be validated statically here.
export const collectionEntryCreateSchema = createInsertSchema(collectionEntries)
  .omit(OMIT)
  .omit({ collectionId: true });

export const collectionEntryUpdateSchema = createUpdateSchema(collectionEntries)
  .omit(OMIT)
  .omit({ collectionId: true });
