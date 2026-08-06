/**
 * Collection constants — pure module (no server dependency), importable by
 * the admin bundle through the `@commun/core/collections/constants` export.
 */

/**
 * Publication lifecycle shared by every publishable table. The editorial flow
 * is driven from the admin; only `published` reaches the public plane.
 */
export const PUBLICATION_STATUSES = [
  'draft',
  'waiting',
  'ready',
  'scheduled',
  'published',
] as const;

export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

// The CLOSED set of field types. Extending it is a spec-level decision:
// arbitrary field types are the free-for-all this design replaces.
export const FIELD_TYPES = [
  'text',
  'rich-text',
  'number',
  'boolean',
  'date',
  'media',
  'relation',
  'select',
  // Ordered steps whose content is rich text.
  'steps',
  // Raw JSON attributes (location, socials, schedules…), served as-is.
  'json',
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];
