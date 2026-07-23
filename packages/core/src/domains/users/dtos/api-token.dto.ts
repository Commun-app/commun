import { z } from 'zod';

export const apiTokenCreateDto = z.object({ name: z.string().min(1) });

export type ApiTokenCreateDto = z.infer<typeof apiTokenCreateDto>;
