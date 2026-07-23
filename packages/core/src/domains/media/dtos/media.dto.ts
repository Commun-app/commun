import { createUpdateSchema } from 'drizzle-zod';
import type { z } from 'zod';
import { media } from '../schema.ts';

// Rows are created by the upload flow (storage keys are chosen by the
// service, never by API input); only editorial fields are writable afterwards.
export const mediaUpdateDto = createUpdateSchema(media).pick({
  alt: true,
  caption: true,
  filename: true,
});

export type MediaUpdateDto = z.infer<typeof mediaUpdateDto>;
