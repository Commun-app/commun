import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { projets } from './schema.ts';

const OMIT = { id: true, createdAt: true, updatedAt: true, legacyExtra: true } as const;

export const projetCreateSchema = createInsertSchema(projets).omit(OMIT);
export const projetUpdateSchema = createUpdateSchema(projets).omit(OMIT);
