import type { z } from 'zod';
import { CommunError, ERR } from '../../common/errors/index.ts';
import { buildDataSchema, type FieldDefinition } from './fields.ts';
import type { CollectionsRepository } from './repository.ts';
import type { MediaService } from '../media/service.ts';
import type { CollectionDefinition, CollectionEntry } from './schema.ts';
import type {
  collectionDefinitionCreateSchema,
  collectionDefinitionUpdateSchema,
  collectionEntryCreateSchema,
  collectionEntryUpdateSchema,
} from './validation.ts';

type DefinitionCreate = z.infer<typeof collectionDefinitionCreateSchema>;
type DefinitionUpdate = z.infer<typeof collectionDefinitionUpdateSchema>;
type EntryCreate = z.infer<typeof collectionEntryCreateSchema>;
type EntryUpdate = z.infer<typeof collectionEntryUpdateSchema>;

/** SQLite unique-index violations surface as raw errors — translate the slug case. */
function mapSlugConflict(error: unknown, collectionSlug: string, entrySlug: string): unknown {
  if (
    error instanceof Error &&
    error.message.includes('UNIQUE constraint failed') &&
    error.message.includes('collection_entries.slug')
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

  listDefinitions(): CollectionDefinition[] {
    return this.repository.listDefinitions();
  }

  getDefinition(idOrSlug: string): CollectionDefinition {
    const found =
      this.repository.findDefinitionBySlug(idOrSlug) ??
      this.repository.findDefinitionById(idOrSlug);
    if (!found) throw new CommunError(ERR.NOT_FOUND, `collection introuvable: ${idOrSlug}`);
    return found;
  }

  createDefinition(input: DefinitionCreate): CollectionDefinition {
    return this.repository.insertDefinition(input);
  }

  updateDefinition(id: string, input: DefinitionUpdate): CollectionDefinition {
    const updated = this.repository.updateDefinition(id, input);
    if (!updated) throw new CommunError(ERR.NOT_FOUND, `collection introuvable: ${id}`);
    return updated;
  }

  removeDefinition(id: string): void {
    if (!this.repository.deleteDefinition(id)) {
      throw new CommunError(ERR.NOT_FOUND, `collection introuvable: ${id}`);
    }
  }

  // ── Entries ────────────────────────────────────────────────────────────────

  private validateData(definition: CollectionDefinition, data: Record<string, unknown>) {
    const schema = buildDataSchema(definition.fields as FieldDefinition[]);
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw new CommunError(
        ERR.INVALID_STATE,
        `données invalides pour la collection ${definition.slug}: ${parsed.error.message}`,
      );
    }
    return parsed.data;
  }

  listEntries(collectionIdOrSlug: string): CollectionEntry[] {
    return this.repository.listEntries(this.getDefinition(collectionIdOrSlug).id);
  }

  listPublishedEntries(
    collectionIdOrSlug: string,
    now = new Date().toISOString(),
  ): CollectionEntry[] {
    return this.repository.listPublishedEntries(this.getDefinition(collectionIdOrSlug).id, now);
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
  ): Promise<Array<CollectionEntry & { data: Record<string, unknown> }>> {
    const definition = this.getDefinition(collectionIdOrSlug);
    const fields = definition.fields as FieldDefinition[];
    const mediaFields = fields.filter((field) => field.type === 'media');
    const richTextFields = fields.filter((field) => field.type === 'rich-text');
    const entries = this.repository.listPublishedEntries(definition.id, now);
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
    for (const definition of this.repository.listDefinitions()) {
      const entries = await this.listPublishedEntriesResolved(definition.id);
      for (const entry of entries) {
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
  publishedSlugs(now = new Date().toISOString()): string[] {
    return this.repository
      .listDefinitions()
      .flatMap((definition) =>
        this.repository
          .listPublishedEntries(definition.id, now)
          .map((entry) => `/${definition.slug}/${entry.slug}`),
      );
  }

  createEntry(collectionIdOrSlug: string, input: EntryCreate): CollectionEntry {
    const definition = this.getDefinition(collectionIdOrSlug);
    const data = this.validateData(definition, input.data);
    try {
      return this.repository.insertEntry({ ...input, data, collectionId: definition.id });
    } catch (error) {
      throw mapSlugConflict(error, definition.slug, input.slug);
    }
  }

  updateEntry(id: string, input: EntryUpdate): CollectionEntry {
    const existing = this.repository.findEntryById(id);
    if (!existing) throw new CommunError(ERR.NOT_FOUND, `entrée introuvable: ${id}`);
    const definition = this.getDefinition(existing.collectionId);
    const data = input.data ? this.validateData(definition, input.data) : undefined;
    try {
      return this.repository.updateEntry(id, { ...input, ...(data ? { data } : {}) })!;
    } catch (error) {
      throw mapSlugConflict(error, definition.slug, input.slug ?? existing.slug);
    }
  }

  removeEntry(id: string): void {
    if (!this.repository.deleteEntry(id)) {
      throw new CommunError(ERR.NOT_FOUND, `entrée introuvable: ${id}`);
    }
  }
}
