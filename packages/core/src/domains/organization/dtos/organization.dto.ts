import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import type { z } from 'zod';
import { SYSTEM_COLUMNS } from '../../../common/dtos/index.ts';
import { organization } from '../schema.ts';

// No `createdBy`: the organization is created once, at install.
const OMIT = { ...SYSTEM_COLUMNS, updatedBy: true } as const;

export const organizationInitDto = createInsertSchema(organization).omit(OMIT);
export const organizationUpdateDto = createUpdateSchema(organization).omit(OMIT);

export type OrganizationInitDto = z.infer<typeof organizationInitDto>;
export type OrganizationUpdateDto = z.infer<typeof organizationUpdateDto>;
