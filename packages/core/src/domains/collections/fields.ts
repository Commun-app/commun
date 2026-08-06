import { z } from 'zod';

/**
 * Contrat des champs de collection — module PUR (zod seul, aucune dépendance
 * serveur), importable par l'ADMIN comme par le serveur : c'est le point
 * d'extension qui permet aux formulaires de valider avec EXACTEMENT la règle
 * que le serveur applique (refonte-admin-ui, D6). Exposé au navigateur via
 * l'export `@commun/core/fields` ; le schéma Drizzle et le service
 * l'importent d'ici — une seule vérité.
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

export const fieldDefinitionSchema = z
  .object({
    /** Machine name of the field inside `data`; case is preserved. */
    name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'nom de champ invalide'),
    label: z.string().min(1),
    type: z.enum(FIELD_TYPES),
    required: z.boolean().default(false),
    /** Hidden fields are editable in the admin but EXCLUDED from public payloads. */
    hidden: z.boolean().default(false),
    /** Choices — required for `select`. */
    options: z.array(z.string().min(1)).optional(),
    /** Target collection slug — required for `relation`. */
    target: z.string().optional(),
  })
  .check((ctx) => {
    if (ctx.value.type === 'select' && !ctx.value.options?.length) {
      ctx.issues.push({
        code: 'custom',
        message: 'options requises pour un champ select',
        input: ctx.value,
      });
    }
    if (ctx.value.type === 'relation' && !ctx.value.target) {
      ctx.issues.push({
        code: 'custom',
        message: 'target requis pour un champ relation',
        input: ctx.value,
      });
    }
  });

export type FieldDefinition = z.infer<typeof fieldDefinitionSchema>;

// Steps are rich objects, served as-is.
const stepSchema = z.record(z.string(), z.unknown());

export const FIELD_VALUE_SCHEMAS: Record<FieldType, z.ZodType> = {
  text: z.string(),
  'rich-text': z.record(z.string(), z.unknown()),
  number: z.number().or(z.string()), // iso legacy : souvent stocké/servi en string
  boolean: z.boolean(),
  date: z.iso.datetime({ offset: true }).or(z.iso.date()),
  media: z.string().or(z.array(z.string())), // media id(s) — iso legacy, un champ media peut être multiple
  relation: z.string().or(z.array(z.string())), // target entry id(s)
  select: z.string(),
  steps: z.array(stepSchema), // iso legacy array-of-steps
  // Raw JSON: anything but undefined — real content also holds scalars.
  json: z.union([
    z.record(z.string(), z.unknown()),
    z.array(z.unknown()),
    z.string(),
    z.number(),
    z.boolean(),
  ]),
};

/**
 * Build the Zod schema validating an entry's `data` from a collection
 * definition — the generated-validation requirement of the spec. Exported
 * standalone: the offline migration CLI and the admin forms use it too.
 */
export function buildDataSchema(fields: FieldDefinition[]): z.ZodType<Record<string, unknown>> {
  const shape: Record<string, z.ZodType> = {};
  for (const field of fields) {
    let valueSchema = FIELD_VALUE_SCHEMAS[field.type];
    if (field.type === 'select' && field.options?.length) {
      valueSchema = z.enum(field.options as [string, ...string[]]);
    }
    shape[field.name] = field.required ? valueSchema : valueSchema.nullable().optional();
  }
  return z.strictObject(shape) as z.ZodType<Record<string, unknown>>;
}
