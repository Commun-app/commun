import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { collectionDefinitions, entries, fieldDefinitionSchema } from './schema.ts';

// tRPC input contracts of the collections domain. System columns are never
// accepted from the outside; `data` is validated separately against the
// definition's generated schema (see service.ts).

const OMIT = { id: true, createdAt: true, updatedAt: true, legacyExtra: true } as const;

export const definitionCreateDto = createInsertSchema(collectionDefinitions)
  .omit(OMIT)
  .extend({ fields: z.array(fieldDefinitionSchema).min(1) });

export const definitionUpdateDto = createUpdateSchema(collectionDefinitions)
  .omit(OMIT)
  .extend({ fields: z.array(fieldDefinitionSchema).min(1).optional() });

export const entryCreateDto = createInsertSchema(entries).omit(OMIT).omit({ collectionId: true });

export const entryUpdateDto = createUpdateSchema(entries).omit(OMIT).omit({ collectionId: true });

export type DefinitionCreateDto = z.infer<typeof definitionCreateDto>;
export type DefinitionUpdateDto = z.infer<typeof definitionUpdateDto>;
export type EntryCreateDto = z.infer<typeof entryCreateDto>;
export type EntryUpdateDto = z.infer<typeof entryUpdateDto>;
