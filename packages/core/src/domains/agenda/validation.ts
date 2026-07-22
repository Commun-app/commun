import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { evenements } from './schema.ts';

const OMIT = { id: true, createdAt: true, updatedAt: true, legacyExtra: true } as const;

export const evenementCreateSchema = createInsertSchema(evenements).omit(OMIT);
export const evenementUpdateSchema = createUpdateSchema(evenements).omit(OMIT);
