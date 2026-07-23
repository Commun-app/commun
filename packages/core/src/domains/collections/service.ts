import { z } from 'zod';
import { CommunError, ERR } from '../../common/errors/index.ts';
import type { CollectionsRepository } from './repository.ts';
import type { MediaService } from '../media/service.ts';
import type { CollectionDefinition, Entry, FieldDefinition, FieldType } from './schema.ts';
import type {
  DefinitionCreateDto,
  DefinitionUpdateDto,
  EntryCreateDto,
  EntryUpdateDto,
} from './dto.ts';

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
 * Build the Zod schema validating an entry's `data` from a collection
 * definition — the generated-validation requirement of the spec. Exported
 * standalone: the offline migration CLI uses it too.
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

/** SQLite unique-index violations surface as raw errors — translate the slug case. */
function mapSlugConflict(error: unknown, collectionSlug: string, entrySlug: string): unknown {
  if (
    error instanceof Error &&
    error.message.includes('UNIQUE constraint failed') &&
    error.message.includes('entries.slug')
  ) {
    return new CommunError(
      ERR.INVALID_STATE,
      `le slug "${entrySlug}" est déjà utilisé dans la collection ${collectionSlug}`,
    );
  }
  return error;
}

/**
 * The content engine: collection definitions (closed field-type set) and
 * their entries, validated against the Zod schema generated from each
 * definition. Media references can be resolved to URLs for the public plane.
 */
export class CollectionsService {
  constructor(
    private readonly repository: CollectionsRepository,
    private readonly media: MediaService,
  ) {}

  // ── Definitions ────────────────────────────────────────────────────────────

  async listDefinitions(): Promise<CollectionDefinition[]> {
    return this.repository.listDefinitions();
  }

  async getDefinition(idOrSlug: string): Promise<CollectionDefinition> {
    const found =
      (await this.repository.findDefinitionBySlug(idOrSlug)) ??
      (await this.repository.findDefinitionById(idOrSlug));
    if (!found) throw new CommunError(ERR.NOT_FOUND, `collection introuvable: ${idOrSlug}`);
    return found;
  }

  async createDefinition(input: DefinitionCreateDto): Promise<CollectionDefinition> {
    return this.repository.insertDefinition(input);
  }

  async updateDefinition(id: string, input: DefinitionUpdateDto): Promise<CollectionDefinition> {
    const updated = await this.repository.updateDefinition(id, input);
    if (!updated) throw new CommunError(ERR.NOT_FOUND, `collection introuvable: ${id}`);
    return updated;
  }

  async removeDefinition(id: string): Promise<void> {
    if (!(await this.repository.deleteDefinition(id))) {
      throw new CommunError(ERR.NOT_FOUND, `collection introuvable: ${id}`);
    }
  }

  // ── Entries ────────────────────────────────────────────────────────────────

  private validateData(definition: CollectionDefinition, data: Record<string, unknown>) {
    const schema = buildDataSchema(definition.fields);
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw new CommunError(
        ERR.INVALID_STATE,
        `données invalides pour la collection ${definition.slug}: ${parsed.error.message}`,
      );
    }
    return parsed.data;
  }

  async listEntries(collectionIdOrSlug: string): Promise<Entry[]> {
    return this.repository.listEntries((await this.getDefinition(collectionIdOrSlug)).id);
  }

  async listPublishedEntries(
    collectionIdOrSlug: string,
    now = new Date().toISOString(),
  ): Promise<Entry[]> {
    return this.repository.listPublishedEntries(
      (await this.getDefinition(collectionIdOrSlug)).id,
      now,
    );
  }

  /**
   * Public plane payload (parity with the legacy content endpoints): published
   * entries with media references resolved to loadable URLs — both media-type
   * field values (→ `{ id, url }`) and image/file nodes embedded in rich-text
   * documents (→ `attrs.src`), so the site build renders without extra calls.
   */
  async listPublishedEntriesResolved(
    collectionIdOrSlug: string,
    now = new Date().toISOString(),
  ): Promise<Array<Entry & { data: Record<string, unknown> }>> {
    const definition = await this.getDefinition(collectionIdOrSlug);
    const mediaFields = definition.fields.filter((field) => field.type === 'media');
    const richTextFields = definition.fields.filter((field) => field.type === 'rich-text');
    const entries = await this.repository.listPublishedEntries(definition.id, now);
    if (mediaFields.length === 0 && richTextFields.length === 0) return entries;

    return Promise.all(
      entries.map(async (entry) => {
        const data = { ...entry.data };
        for (const field of mediaFields) {
          const mediaId = data[field.name];
          if (typeof mediaId !== 'string' || !mediaId) continue;
          const url = await this.media.url(mediaId);
          data[field.name] = url ? { id: mediaId, url } : null;
        }
        for (const field of richTextFields) {
          if (data[field.name] && typeof data[field.name] === 'object') {
            data[field.name] = await this.resolveRichTextMedia(data[field.name]);
          }
        }
        return { ...entry, data };
      }),
    );
  }

  /** Walk a rich-text JSON document and resolve image/file node ids to URLs. */
  private async resolveRichTextMedia(node: unknown): Promise<unknown> {
    if (Array.isArray(node)) {
      return Promise.all(node.map((child) => this.resolveRichTextMedia(child)));
    }
    if (node === null || typeof node !== 'object') return node;

    const copy: Record<string, unknown> = { ...(node as Record<string, unknown>) };
    const attrs = copy.attrs as Record<string, unknown> | undefined;
    if (
      (copy.type === 'image' || copy.type === 'file') &&
      attrs &&
      typeof attrs.id === 'string' &&
      attrs.id
    ) {
      copy.attrs = { ...attrs, src: await this.media.url(attrs.id) };
    }
    if (Array.isArray(copy.content)) {
      copy.content = await this.resolveRichTextMedia(copy.content);
    }
    return copy;
  }

  /**
   * Legacy-compat payload of `GET /api/v1/content/records`: ONE flat map of
   * every published entry across all collections, keyed by id, media resolved
   * — the shape the current site builds consume.
   */
  async legacyRecordsPayload(): Promise<Record<string, Record<string, unknown>>> {
    const records: Record<string, Record<string, unknown>> = {};
    for (const definition of await this.repository.listDefinitions()) {
      const resolved = await this.listPublishedEntriesResolved(definition.id);
      for (const entry of resolved) {
        records[entry.id] = {
          _id: entry.id,
          title: entry.title,
          slug: entry.slug,
          relatedCollection: definition.slug,
          status: entry.status,
          publishedAt: entry.publishedAt,
          ...entry.data,
        };
      }
    }
    return records;
  }

  /** Public slugs of every published entry (`/collection/entry`), for the deployment payload. */
  async publishedSlugs(now = new Date().toISOString()): Promise<string[]> {
    const slugs: string[] = [];
    for (const definition of await this.repository.listDefinitions()) {
      const published = await this.repository.listPublishedEntries(definition.id, now);
      slugs.push(...published.map((entry) => `/${definition.slug}/${entry.slug}`));
    }
    return slugs;
  }

  async createEntry(collectionIdOrSlug: string, input: EntryCreateDto): Promise<Entry> {
    const definition = await this.getDefinition(collectionIdOrSlug);
    const data = this.validateData(definition, input.data);
    try {
      return await this.repository.insertEntry({ ...input, data, collectionId: definition.id });
    } catch (error) {
      throw mapSlugConflict(error, definition.slug, input.slug);
    }
  }

  async updateEntry(id: string, input: EntryUpdateDto): Promise<Entry> {
    const existing = await this.repository.findEntryById(id);
    if (!existing) throw new CommunError(ERR.NOT_FOUND, `entrée introuvable: ${id}`);
    const definition = await this.getDefinition(existing.collectionId);
    const data = input.data ? this.validateData(definition, input.data) : undefined;
    try {
      return (await this.repository.updateEntry(id, { ...input, ...(data ? { data } : {}) }))!;
    } catch (error) {
      throw mapSlugConflict(error, definition.slug, input.slug ?? existing.slug);
    }
  }

  async removeEntry(id: string): Promise<void> {
    if (!(await this.repository.deleteEntry(id))) {
      throw new CommunError(ERR.NOT_FOUND, `entrée introuvable: ${id}`);
    }
  }
}
