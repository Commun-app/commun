import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { elus } from './schema.ts';

const OMIT = { id: true, createdAt: true, updatedAt: true, legacyExtra: true } as const;

export const eluCreateSchema = createInsertSchema(elus).omit(OMIT);
export const eluUpdateSchema = createUpdateSchema(elus).omit(OMIT);
