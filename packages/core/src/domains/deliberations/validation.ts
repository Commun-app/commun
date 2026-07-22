import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { deliberations, seances } from './schema.ts';

const OMIT = { id: true, createdAt: true, updatedAt: true, legacyExtra: true } as const;

export const seanceCreateSchema = createInsertSchema(seances).omit(OMIT);
export const seanceUpdateSchema = createUpdateSchema(seances).omit(OMIT);

export const deliberationCreateSchema = createInsertSchema(deliberations).omit(OMIT);
export const deliberationUpdateSchema = createUpdateSchema(deliberations)
  .omit(OMIT)
  .omit({ seanceId: true });
