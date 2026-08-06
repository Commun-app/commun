import { z } from 'zod';
import { FIELD_TYPES, type FieldType } from './constants.ts';

/**
 * Field validation contract — pure module (zod only), importable by the admin
 * bundle through the `@commun/core/collections/utils` export so forms validate
 * with EXACTLY the rule the server applies. The Drizzle schema and the service
 * import from here; it cannot live in schema.ts, whose table re-exports would
 * create an import cycle with the database module.
 */

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
  number: z.number().or(z.string()), // often stored/served as string (legacy data)
  boolean: z.boolean(),
  date: z.iso.datetime({ offset: true }).or(z.iso.date()),
  media: z.string().or(z.array(z.string())), // media id(s) — a media field may be multiple
  relation: z.string().or(z.array(z.string())), // target entry id(s)
  select: z.string(),
  steps: z.array(stepSchema),
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
 * definition. Standalone on purpose: the migration CLI and the admin forms
 * use it too.
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
