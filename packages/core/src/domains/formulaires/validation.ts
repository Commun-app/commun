import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { fieldDefinitionSchema } from '../collections/fields.ts';
import { formulaires } from './schema.ts';

const OMIT = { id: true, createdAt: true, updatedAt: true, legacyExtra: true } as const;

// Form fields share the closed field-type set of custom collections.
export const formulaireCreateSchema = createInsertSchema(formulaires)
  .omit(OMIT)
  .extend({ fields: z.array(fieldDefinitionSchema) });
export const formulaireUpdateSchema = createUpdateSchema(formulaires)
  .omit(OMIT)
  .extend({ fields: z.array(fieldDefinitionSchema).optional() });

/** Public submission payload — the `data` is validated against the form's fields. */
export const soumissionCreateSchema = z.object({
  data: z.record(z.string(), z.unknown()),
});
