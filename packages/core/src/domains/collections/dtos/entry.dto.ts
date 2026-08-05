import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { WRITE_OMIT } from '../../../common/dtos/index.ts';
import { entries } from '../schema.ts';

// `data` is validated separately, against the schema generated from the
// collection definition (see service.ts). `related` is system-managed on create.
const OMIT = { ...WRITE_OMIT, related: true, collectionId: true } as const;

// Slug optional: derived from the title, with an incremental suffix on collision.
export const entryCreateDto = createInsertSchema(entries)
  .omit(OMIT)
  .extend({ slug: z.string().optional() });

// `related` reopens on UPDATE only: free links between entries are edited
// directly, and the server keeps them symmetric (see service.updateEntry).
export const entryUpdateDto = createUpdateSchema(entries)
  .omit(OMIT)
  .extend({ related: z.array(z.string()).optional() });

export type EntryCreateDto = z.infer<typeof entryCreateDto>;
export type EntryUpdateDto = z.infer<typeof entryUpdateDto>;
