import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { collectionDefinitions, fieldDefinitionSchema } from '../schema.ts';

// System columns are never accepted from the outside.
const OMIT = { id: true, createdAt: true, updatedAt: true, legacyExtra: true } as const;

export const definitionCreateDto = createInsertSchema(collectionDefinitions)
  .omit(OMIT)
  .extend({ fields: z.array(fieldDefinitionSchema).min(1) });

export const definitionUpdateDto = createUpdateSchema(collectionDefinitions)
  .omit(OMIT)
  .extend({ fields: z.array(fieldDefinitionSchema).min(1).optional() });

export type DefinitionCreateDto = z.infer<typeof definitionCreateDto>;
export type DefinitionUpdateDto = z.infer<typeof definitionUpdateDto>;
