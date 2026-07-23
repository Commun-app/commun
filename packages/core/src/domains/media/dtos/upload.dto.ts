import { z } from 'zod';

// Iso legacy two-step upload flow: request a pre-signed PUT URL, upload
// directly to S3, then finalize.

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

export type MediaRequestUploadDto = z.infer<typeof mediaRequestUploadDto>;
export type MediaFinalizeDto = z.infer<typeof mediaFinalizeDto>;
