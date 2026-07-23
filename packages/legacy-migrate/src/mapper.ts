import { dateOf, idOf, type LegacyDoc } from './read-dump.ts';
import type { FieldDefinition } from '@commun/core';

/**
 * Legacy Collection → Commun collection definition mapping. The legacy admin
 * described fields as `attributes[]` whose `component` names a form widget;
 * we map each widget to the closed Commun field-type set. Unmappable
 * attributes are reported and their VALUES preserved in `legacy_extra`.
 */
const COMPONENT_TO_FIELD_TYPE: Record<string, FieldDefinition['type']> = {
  'input-text': 'text',
  'input-textarea': 'text',
  'input-slug': 'text',
  'input-number': 'number',
  'input-toggle': 'boolean',
  'input-checkbox': 'boolean',
  'input-date': 'date',
  'input-datetime': 'date',
  'input-wysiwyg': 'rich-text',
  'input-files-media': 'media',
  'input-file-media': 'media',
  'select-enum': 'select',
  'select-record': 'relation',
  'handler-records': 'relation',
  // Iso legacy: contenu par étapes (wysiwyg par étape).
  'array-of-steps': 'steps',
};

/** Attribute names that map onto entry COLUMNS instead of data fields. */
const COLUMN_ATTRIBUTES = new Set(['title', 'name', 'slug']);

export interface MappedField {
  field: FieldDefinition | null;
  legacyComponent: string;
  legacyName: string;
}

export function mapAttributeDefinition(attribute: LegacyDoc): MappedField {
  const legacyName = String(attribute.name ?? '');
  const legacyComponent = String(attribute.component ?? attribute.type ?? 'unknown');
  const type = COMPONENT_TO_FIELD_TYPE[legacyComponent];
  if (!type || COLUMN_ATTRIBUTES.has(legacyName)) {
    return { field: null, legacyComponent, legacyName };
  }

  const options = Array.isArray(attribute.enum)
    ? attribute.enum.map(String)
    : Array.isArray((attribute.componentOptions as LegacyDoc | undefined)?.options)
      ? ((attribute.componentOptions as LegacyDoc).options as unknown[]).map(String)
      : undefined;

  const componentOptions = attribute.componentOptions as LegacyDoc | undefined;
  const field: FieldDefinition = {
    name:
      legacyName
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .replace(/^_+/, '')
        .toLowerCase() || 'field',
    label: String((attribute.headings as LegacyDoc | undefined)?.label ?? legacyName),
    type,
    required: Boolean(attribute.required),
    // Iso legacy `options.hidden` : exclu des payloads publics.
    hidden: Boolean(
      (attribute.options as LegacyDoc | undefined)?.hidden ?? componentOptions?.hidden,
    ),
    ...(type === 'select' && options?.length ? { options } : {}),
    ...(type === 'relation'
      ? {
          target: String(
            (attribute.componentOptions as LegacyDoc | undefined)?.collection ?? 'unknown',
          ),
        }
      : {}),
  };
  // A select without options cannot survive validation — degrade to text.
  if (type === 'select' && !options?.length)
    return { field: { ...field, type: 'text' }, legacyComponent, legacyName };
  return { field, legacyComponent, legacyName };
}

export interface MappedEntry {
  title: string;
  slug: string;
  data: Record<string, unknown>;
  status: 'draft' | 'published';
  publishedAt: string | null;
  legacyExtra: Record<string, unknown>;
  legacyId: string;
  mediaRefs: string[];
}

/**
 * Legacy Record → Commun entry. `attributes` is [{ name, value }]; values of
 * mapped fields land in `data` (normalised per type), everything else in
 * `legacy_extra`. Media/relation values keep their legacy ids — remapped by
 * the writer once targets are inserted.
 */
export function mapRecord(
  record: LegacyDoc,
  fieldsByLegacyName: Map<string, FieldDefinition>,
): MappedEntry {
  const attributes = Array.isArray(record.attributes) ? (record.attributes as LegacyDoc[]) : [];
  const byName = new Map(attributes.map((attribute) => [String(attribute.name), attribute.value]));

  const title = String(byName.get('title') ?? byName.get('name') ?? record.title ?? 'Sans titre');
  const slug = String(byName.get('slug') ?? record.slug ?? idOf(record._id));

  const data: Record<string, unknown> = {};
  const legacyExtra: Record<string, unknown> = {};
  const mediaRefs: string[] = [];

  for (const [name, raw] of byName) {
    if (COLUMN_ATTRIBUTES.has(name)) continue;
    const field = fieldsByLegacyName.get(name);
    if (!field) {
      legacyExtra[name] = raw;
      continue;
    }
    let value: unknown = raw;
    if (raw == null) continue;
    switch (field.type) {
      case 'number':
        value = Number(raw);
        break;
      case 'boolean':
        value = Boolean(raw);
        break;
      case 'date':
        value = dateOf(raw) ?? String(raw);
        break;
      case 'media': {
        const ref = idOf(Array.isArray(raw) ? raw[0] : raw);
        if (ref) mediaRefs.push(ref);
        value = ref;
        break;
      }
      case 'relation':
        value = idOf(Array.isArray(raw) ? raw[0] : raw);
        break;
      case 'rich-text':
        value = typeof raw === 'object' ? raw : { type: 'doc', legacyHtml: String(raw) };
        break;
      default:
        value = typeof raw === 'string' ? raw : JSON.stringify(raw);
    }
    data[field.name] = value;
  }

  const status = record.status === 'published' ? 'published' : 'draft';
  return {
    title,
    slug,
    data,
    status,
    publishedAt: dateOf(record.publishedAt),
    legacyExtra,
    legacyId: idOf(record._id),
    mediaRefs,
  };
}
