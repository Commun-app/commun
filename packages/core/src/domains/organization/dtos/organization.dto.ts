import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import type { z } from 'zod';
import { organization } from '../schema.ts';

// System columns are never accepted from the outside.
const OMIT = { id: true, createdAt: true, updatedAt: true, legacyExtra: true } as const;

export const organizationInitDto = createInsertSchema(organization).omit(OMIT);
export const organizationUpdateDto = createUpdateSchema(organization).omit(OMIT);

export type OrganizationInitDto = z.infer<typeof organizationInitDto>;
export type OrganizationUpdateDto = z.infer<typeof organizationUpdateDto>;
