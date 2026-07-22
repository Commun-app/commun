import { z } from 'zod';

/**
 * The CLOSED set of field types available to collections (and citizen forms).
 * Extending this set is a spec-level decision — arbitrary field types are
 * exactly the legacy JSON free-for-all this design replaces.
 */
export const FIELD_TYPES = [
  'text',
  'rich-text',
  'number',
  'boolean',
  'date',
  'media',
  'relation',
  'select',
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const fieldDefinitionSchema = z
  .object({
    /** Machine name of the field inside `data`. */
    name: z.string().regex(/^[a-z][a-z0-9_]*$/, 'nom de champ invalide (snake_case attendu)'),
    label: z.string().min(1),
    type: z.enum(FIELD_TYPES),
    required: z.boolean().default(false),
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

const FIELD_VALUE_SCHEMAS: Record<FieldType, z.ZodType> = {
  text: z.string(),
  'rich-text': z.record(z.string(), z.unknown()),
  number: z.number(),
  boolean: z.boolean(),
  date: z.iso.datetime({ offset: true }).or(z.iso.date()),
  media: z.string(), // media id
  relation: z.string(), // target entry id
  select: z.string(),
};

/**
 * Build the Zod schema validating an entry's `data` from a collection (or
 * form) definition — the generated-validation requirement of the spec.
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
