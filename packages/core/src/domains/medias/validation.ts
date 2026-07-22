import { createUpdateSchema } from 'drizzle-zod';
import { medias } from './schema.ts';

// Media rows are created by the upload flow (driver + objects are chosen by
// the storage service, never by API input); only editorial fields are writable.
export const mediaUpdateSchema = createUpdateSchema(medias).pick({
  alt: true,
  caption: true,
  filename: true,
});
