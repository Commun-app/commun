import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { actualites } from './schema.ts';

const OMIT = { id: true, createdAt: true, updatedAt: true, legacyExtra: true } as const;

export const actualiteCreateSchema = createInsertSchema(actualites).omit(OMIT);
export const actualiteUpdateSchema = createUpdateSchema(actualites).omit(OMIT);
