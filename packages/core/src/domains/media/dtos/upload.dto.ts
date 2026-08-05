import { z } from 'zod';

// Two-step upload: request a pre-signed PUT URL, upload straight to storage,
// then finalize.

export const mediaRequestUploadDto = z.object({
  filename: z.string().min(1),
  mime: z.string().min(1),
  /** Attached to the stored object as user metadata. */
  metaData: z.record(z.string(), z.string()).optional(),
});

export const mediaFinalizeDto = z.object({
  key: z.string().min(1),
  filename: z.string().min(1),
  mime: z.string().min(1),
  alt: z.string().optional(),
  /** Stored on the media row — the APIDAE sync deduplicates on `apidaeId`. */
  metaData: z.record(z.string(), z.unknown()).optional(),
});

export type MediaRequestUploadDto = z.infer<typeof mediaRequestUploadDto>;
export type MediaFinalizeDto = z.infer<typeof mediaFinalizeDto>;
