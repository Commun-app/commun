import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import type { z } from 'zod';
import { entries } from '../schema.ts';

// System columns are never accepted from the outside; `data` is validated
// separately against the definition's generated schema (see service.ts).
const OMIT = { id: true, createdAt: true, updatedAt: true, legacyExtra: true } as const;

export const entryCreateDto = createInsertSchema(entries).omit(OMIT).omit({ collectionId: true });

export const entryUpdateDto = createUpdateSchema(entries).omit(OMIT).omit({ collectionId: true });

export type EntryCreateDto = z.infer<typeof entryCreateDto>;
export type EntryUpdateDto = z.infer<typeof entryUpdateDto>;
