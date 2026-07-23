import { z } from 'zod';

// Iso legacy two-step upload flow: request a pre-signed PUT URL, upload
// directly to S3, then finalize.

export const mediaRequestUploadDto = z.object({
  filename: z.string().min(1),
  mime: z.string().min(1),
  /** Attached to the S3 object as user metadata (iso legacy). */
  metaData: z.record(z.string(), z.string()).optional(),
});

export const mediaFinalizeDto = z.object({
  key: z.string().min(1),
  filename: z.string().min(1),
  mime: z.string().min(1),
  alt: z.string().optional(),
  /** Stored on the media row (iso legacy — job-data-sync deduplicates via apidaeId). */
  metaData: z.record(z.string(), z.unknown()).optional(),
});

export type MediaRequestUploadDto = z.infer<typeof mediaRequestUploadDto>;
export type MediaFinalizeDto = z.infer<typeof mediaFinalizeDto>;
