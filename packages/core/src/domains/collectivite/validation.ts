import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { collectivite } from './schema.ts';

const OMIT = { id: true, createdAt: true, updatedAt: true, legacyExtra: true } as const;

export const collectiviteInitSchema = createInsertSchema(collectivite).omit(OMIT);
export const collectiviteUpdateSchema = createUpdateSchema(collectivite).omit(OMIT);
