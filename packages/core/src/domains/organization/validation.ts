import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { organization } from './schema.ts';

const OMIT = { id: true, createdAt: true, updatedAt: true, legacyExtra: true } as const;

export const organizationInitSchema = createInsertSchema(organization).omit(OMIT);
export const organizationUpdateSchema = createUpdateSchema(organization).omit(OMIT);
