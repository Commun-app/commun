import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { fieldDefinitionSchema } from '../collections/fields.ts';
import { forms } from './schema.ts';

const OMIT = { id: true, createdAt: true, updatedAt: true, legacyExtra: true } as const;

// Form fields share the closed field-type set of collections.
export const formCreateSchema = createInsertSchema(forms)
  .omit(OMIT)
  .extend({ fields: z.array(fieldDefinitionSchema) });
export const formUpdateSchema = createUpdateSchema(forms)
  .omit(OMIT)
  .extend({ fields: z.array(fieldDefinitionSchema).optional() });

/** Public submission payload — the `data` is validated against the form's fields. */
export const formSubmissionCreateSchema = z.object({
  data: z.record(z.string(), z.unknown()),
});
