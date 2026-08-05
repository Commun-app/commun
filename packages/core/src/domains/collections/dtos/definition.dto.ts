import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { WRITE_OMIT } from '../../../common/dtos/index.ts';
import { collectionDefinitions, fieldDefinitionSchema } from '../schema.ts';

// Slug optional (derived from the name); editor/display/headings are admin settings.
export const definitionCreateDto = createInsertSchema(collectionDefinitions)
  .omit(WRITE_OMIT)
  .extend({ fields: z.array(fieldDefinitionSchema).min(1), slug: z.string().optional() });

export const definitionUpdateDto = createUpdateSchema(collectionDefinitions)
  .omit(WRITE_OMIT)
  .extend({ fields: z.array(fieldDefinitionSchema).min(1).optional() });

export type DefinitionCreateDto = z.infer<typeof definitionCreateDto>;
export type DefinitionUpdateDto = z.infer<typeof definitionUpdateDto>;
