import { createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { media } from './schema.ts';

// tRPC input contracts of the media domain. Rows are created by the two-step
// upload flow (storage keys are chosen by the service, never by API input);
// only editorial fields are writable afterwards.

export const mediaRequestUploadDto = z.object({
  filename: z.string().min(1),
  mime: z.string().min(1),
});

export const mediaFinalizeDto = z.object({
  key: z.string().min(1),
  filename: z.string().min(1),
  mime: z.string().min(1),
  alt: z.string().optional(),
});

export const mediaUpdateDto = createUpdateSchema(media).pick({
  alt: true,
  caption: true,
  filename: true,
});

export type MediaRequestUploadDto = z.infer<typeof mediaRequestUploadDto>;
export type MediaFinalizeDto = z.infer<typeof mediaFinalizeDto>;
export type MediaUpdateDto = z.infer<typeof mediaUpdateDto>;
