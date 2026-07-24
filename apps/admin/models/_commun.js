/**
 * Pont legacy ↔ Commun partagé par les modèles : cache des définitions de
 * collections, conversion attributes[] ↔ fields[] (même table que le
 * migrateur packages/legacy-migrate) et conversion des VALEURS de champs.
 *
 * Contrat de valeurs (iso legacy Mongo, où tout le complexe était stringifié) :
 * - rich-text : STRING côté widgets (input-wysiwyg) ↔ OBJET côté serveur
 * - steps[].content : STRING côté widgets ↔ OBJET côté serveur
 * - tout le reste (media/relation ids, dates, nombres, json/schedules/location)
 *   circule tel quel.
 */

// ── Mapping composants de formulaire ↔ types de champs Commun ──────────────
export const COMPONENT_TO_FIELD_TYPE = {
  'input-text': 'text',
  'input-textarea': 'text',
  'input-text-area': 'text',
  'input-slug': 'text',
  'input-number': 'number',
  'input-toggle': 'boolean',
  'input-checkbox': 'boolean',
  'input-date': 'date',
  'input-datetime': 'date',
  'input-wysiwyg': 'rich-text',
  'input-files-media': 'media',
  'input-file-media': 'media',
  'input-location': 'json',
  'select-enum': 'select',
  'select-record': 'relation',
  'handler-records': 'relation',
  'handler-schedules': 'json',
  'array-of-steps': 'steps',
  'handler-steps': 'steps'
}

// Composant par défaut pour AFFICHER un champ Commun dans l'éditeur de
// collections (perte assumée : text ne distingue plus input-text/textarea).
export const FIELD_TYPE_TO_COMPONENT = {
  text: 'input-text',
  'rich-text': 'input-wysiwyg',
  number: 'input-number',
  boolean: 'input-toggle',
  date: 'input-date',
  media: 'input-files-media',
  relation: 'select-record',
  select: 'select-enum',
  steps: 'array-of-steps',
  json: 'input-text'
}

// ── Cache module des définitions (rafraîchi par Collection.list/mutations) ──
let _definitions = null

export async function getDefinitions(trpc) {
  if (!_definitions) {
    const definitions = await trpc.collections.list.query()
    _definitions = new Map(definitions.map((definition) => [definition.slug, definition]))
  }
  return _definitions
}

export function invalidateDefinitions() {
  _definitions = null
}

export async function getDefinition(trpc, slug) {
  const definitions = await getDefinitions(trpc)
  const definition = definitions.get(slug)
  if (!definition) throw new Error(`E_UNKNOWN_COLLECTION: ${slug}`)
  return definition
}

// ── Conversion des valeurs de champs ────────────────────────────────────────
function tryParse(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    // Convention migrateur : un contenu non-JSON est encapsulé.
    return { type: 'doc', legacyHtml: String(raw) }
  }
}

/** Valeur serveur (objets) → valeur widget (stringifiée si rich-text/steps). */
export function toClientValue(field, value) {
  if (value == null) return value
  switch (field?.type) {
    case 'rich-text':
      return typeof value === 'string' ? value : JSON.stringify(value)
    case 'steps':
      return (Array.isArray(value) ? value : []).map((step) => ({
        ...step,
        content: typeof step?.content === 'string'
          ? step.content
          : JSON.stringify(step?.content ?? {})
      }))
    default:
      return value
  }
}

/** Valeur widget → valeur serveur (parse rich-text/steps, boolean normalisé). */
export function toServerValue(field, value) {
  if (value == null) return value
  switch (field?.type) {
    case 'rich-text':
      return typeof value === 'string' ? tryParse(value) : value
    case 'steps':
      return (Array.isArray(value) ? value : []).map((step) => ({
        ...step,
        content: typeof step?.content === 'string' ? tryParse(step.content) : step?.content
      }))
    case 'boolean':
      return Boolean(value)
    default:
      return value
  }
}

// ── Conversion des définitions attributes[] ↔ fields[] ─────────────────────
/** FieldDefinition Commun → attribut legacy (édition de collections). */
export function fieldToAttribute(field) {
  return {
    name: field.name,
    component: FIELD_TYPE_TO_COMPONENT[field.type] ?? 'input-text',
    required: Boolean(field.required),
    options: { hidden: Boolean(field.hidden) },
    headings: { label: field.label ?? field.name },
    ...(field.options?.length ? { enum: field.options } : {}),
    ...(field.target ? { componentOptions: { collection: field.target } } : {})
  }
}

/** Attribut legacy → FieldDefinition Commun (null si non mappable). */
export function attributeToField(attribute) {
  const name = String(attribute.name ?? '')
  // title/name/slug sont des COLONNES d'entrée, pas des champs (iso migrateur).
  if (['title', 'name', 'slug'].includes(name)) return null
  const component = String(attribute.component ?? attribute.type ?? '')
  const type = COMPONENT_TO_FIELD_TYPE[component]
  if (!type) return null

  const options = Array.isArray(attribute.enum)
    ? attribute.enum.map(String)
    : Array.isArray(attribute.componentOptions?.options)
      ? attribute.componentOptions.options.map(String)
      : undefined

  const field = {
    name: name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+/, '') || 'field',
    label: String(attribute.headings?.label ?? name),
    type,
    required: Boolean(attribute.required),
    hidden: Boolean(attribute.options?.hidden ?? attribute.componentOptions?.hidden),
    ...(type === 'select' && options?.length ? { options } : {}),
    ...(type === 'relation'
      ? { target: String(attribute.componentOptions?.collection ?? 'unknown') }
      : {})
  }
  // Un select sans options ne passe pas la validation serveur — dégradé en texte.
  if (type === 'select' && !options?.length) return { ...field, type: 'text' }
  return field
}

// ── Projections d'entités Commun → enregistrements legacy ──────────────────
/** Entry Commun → record legacy aplati par onRetrieve côté composants. */
export function entryToRecord(definition, entry) {
  const fieldsByName = new Map(definition.fields.map((field) => [field.name, field]))
  return {
    _id: entry.id,
    title: entry.title,
    slug: entry.slug,
    path: '',
    status: entry.status,
    relatedCollection: definition.slug,
    records: entry.related ?? [],
    attributes: Object.entries(entry.data ?? {}).map(([name, value]) => ({
      name,
      value: toClientValue(fieldsByName.get(name), value)
    })),
    createdBy: {},
    updatedBy: {},
    publishedAt: entry.publishedAt ?? '',
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt
  }
}

/** CollectionDefinition Commun → collection legacy. */
export function definitionToCollection(definition) {
  return {
    _id: definition.id,
    name: definition.name,
    slug: definition.slug,
    description: definition.description ?? '',
    headings: definition.headings ?? {},
    display: definition.display ?? {},
    editor: definition.editor ?? {},
    attributes: (definition.fields ?? []).map(fieldToAttribute),
    organization: '',
    createdBy: {},
    updatedBy: {},
    createdAt: definition.createdAt,
    updatedAt: definition.updatedAt
  }
}

/** Media Commun (objects signés) → media legacy. */
export function mediaToLegacy(media) {
  return {
    _id: media.id,
    originalName: media.filename,
    mime: media.mime,
    objects: media.objects ?? {},
    organization: '',
    createdBy: '',
    updatedBy: '',
    createdAt: media.createdAt,
    updatedAt: media.updatedAt
  }
}
