import { createUpdateSchema } from 'drizzle-zod';
import { media } from './schema.ts';

// Media rows are created by the upload flow (driver + objects are chosen by
// the storage service, never by API input); only editorial fields are writable.
export const mediaUpdateSchema = createUpdateSchema(media).pick({
  alt: true,
  caption: true,
  filename: true,
});
