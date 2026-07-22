import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { councilSessions, deliberations } from './schema.ts';

const OMIT = { id: true, createdAt: true, updatedAt: true, legacyExtra: true } as const;

export const councilSessionCreateSchema = createInsertSchema(councilSessions).omit(OMIT);
export const councilSessionUpdateSchema = createUpdateSchema(councilSessions).omit(OMIT);

export const deliberationCreateSchema = createInsertSchema(deliberations).omit(OMIT);
export const deliberationUpdateSchema = createUpdateSchema(deliberations)
  .omit(OMIT)
  .omit({ sessionId: true });
