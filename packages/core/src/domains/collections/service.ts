import { buildDataSchema } from './utils.ts';
import { z } from 'zod';
import {
  CollectionNotFoundError,
  DuplicateSlugError,
  EntryNotFoundError,
  InvalidEntryDataError,
} from './errors.ts';
import { slugify } from '../../common/utils/slug.ts';
import type { DefinitionRepository, EntryRepository } from './repositories/index.ts';
import type { MediaService } from '../media/service.ts';
import type { CollectionDefinition, Entry, FieldDefinition, FieldType } from './schema.ts';
import type {
  DefinitionCreateDto,
  DefinitionUpdateDto,
  EntryCreateDto,
  EntryUpdateDto,
} from './dtos/index.ts';

/** Ids referenced by relation-type fields of an entry (single or arrays). */
function relationIds(fields: FieldDefinition[], data: Record<string, unknown>): string[] {
  const ids: string[] = [];
  for (const field of fields) {
    if (field.type !== 'relation') continue;
    const value = data[field.name];
    if (typeof value === 'string' && value) ids.push(value);
    else if (Array.isArray(value))
      ids.push(...value.filter((v): v is string => typeof v === 'string'));
  }
  return [...new Set(ids)];
}

/**
 * The content engine: collection definitions over a closed field-type set, and
 * their entries, validated against the Zod schema generated from each definition.
 */
export class CollectionsService {
  constructor(
    private readonly definitions: DefinitionRepository,
    private readonly entries: EntryRepository,
    private readonly media: MediaService,
  ) {}

  // ── Definitions ────────────────────────────────────────────────────────────

  async listDefinitions(): Promise<CollectionDefinition[]> {
    return this.definitions.list();
  }

  async getDefinition(idOrSlug: string): Promise<CollectionDefinition> {
    const found =
      (await this.definitions.findBySlug(idOrSlug)) ?? (await this.definitions.findById(idOrSlug));
    if (!found) throw new CollectionNotFoundError(`collection not found: ${idOrSlug}`);
    return found;
  }

  async createDefinition(
    input: DefinitionCreateDto,
    actorId?: string,
  ): Promise<CollectionDefinition> {
    return this.definitions.insert({
      ...input,
      slug: input.slug || (await this.uniqueDefinitionSlug(slugify(input.name))),
      createdBy: actorId ?? null,
      updatedBy: actorId ?? null,
    });
  }

  async updateDefinition(
    id: string,
    input: DefinitionUpdateDto,
    actorId?: string,
  ): Promise<CollectionDefinition> {
    const updated = await this.definitions.update(id, {
      ...input,
      updatedBy: actorId ?? null,
    });
    if (!updated) throw new CollectionNotFoundError(`collection not found: ${id}`);
    return updated;
  }

  async removeDefinition(id: string): Promise<void> {
    if (!(await this.definitions.delete(id))) {
      throw new CollectionNotFoundError(`collection not found: ${id}`);
    }
  }

  // ── Entries ────────────────────────────────────────────────────────────────

  private validateData(definition: CollectionDefinition, data: Record<string, unknown>) {
    const schema = buildDataSchema(definition.fields);
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw new InvalidEntryDataError(
        `invalid data for collection ${definition.slug}: ${parsed.error.message}`,
      );
    }
    return parsed.data;
  }

  async listEntries(collectionIdOrSlug: string): Promise<Entry[]> {
    return this.entries.list((await this.getDefinition(collectionIdOrSlug)).id);
  }

  async getEntry(id: string): Promise<Entry> {
    const found = await this.entries.findById(id);
    if (!found) throw new EntryNotFoundError(`entry not found: ${id}`);
    return found;
  }

  /** Paginated admin listing, most recently updated first. */
  async listEntriesPaginated(
    collectionIdOrSlug: string,
    options: { skip?: number; limit?: number } = {},
  ): Promise<Entry[]> {
    const definition = await this.getDefinition(collectionIdOrSlug);
    return this.entries.listPaginated(definition.id, {
      skip: options.skip ?? 0,
      limit: options.limit ?? 20,
    });
  }

  async listPublishedEntries(collectionIdOrSlug: string): Promise<Entry[]> {
    return this.entries.listPublished((await this.getDefinition(collectionIdOrSlug)).id);
  }

  async createEntry(
    collectionIdOrSlug: string,
    input: EntryCreateDto,
    actorId?: string,
  ): Promise<Entry> {
    const definition = await this.getDefinition(collectionIdOrSlug);
    const data = this.validateData(definition, input.data);
    // Slug derived from the title, with an incremental suffix on collision.
    const slug = await this.uniqueEntrySlug(definition.id, input.slug || slugify(input.title));
    const entry = await this.entries.insert({
      ...input,
      slug,
      data,
      collectionId: definition.id,
      createdBy: actorId ?? null,
      updatedBy: actorId ?? null,
      // publishedAt is stamped automatically on publication.
      publishedAt:
        input.status === 'published'
          ? (input.publishedAt ?? new Date().toISOString())
          : input.publishedAt,
    });
    await this.linkRelations(definition, entry.id, [], relationIds(definition.fields, data));
    return entry;
  }

  /** PARTIAL update: `data` is merged field by field with what already exists. */
  async updateEntry(id: string, input: EntryUpdateDto, actorId?: string): Promise<Entry> {
    const existing = await this.entries.findById(id);
    if (!existing) throw new EntryNotFoundError(`entry not found: ${id}`);
    const definition = await this.getDefinition(existing.collectionId);

    // Schema evolution: a key of the EXISTING entry that no longer matches any
    // field is kept untouched, hidden from payloads, and restored if the field
    // comes back. Unknown keys coming from the CALLER are still rejected.
    const definedNames = new Set(definition.fields.map((field) => field.name));
    const orphanData = Object.fromEntries(
      Object.entries(existing.data ?? {}).filter(([key]) => !definedNames.has(key)),
    );
    const mergedData = input.data ? { ...existing.data, ...input.data } : existing.data;
    const definedData = Object.fromEntries(
      Object.entries(mergedData).filter(
        ([key]) => definedNames.has(key) || key in (input.data ?? {}),
      ),
    );
    const data = input.data
      ? { ...orphanData, ...this.validateData(definition, definedData) }
      : undefined;

    const patch: Partial<Entry> = { ...input, updatedBy: actorId ?? null };
    if (data) patch.data = data;
    // publishedAt is REWRITTEN on every transition to published: it is a stamp,
    // never a schedule.
    if (input.status === 'published' && !input.publishedAt) {
      patch.publishedAt = new Date().toISOString();
    }

    try {
      const updated = (await this.entries.update(id, patch))!;
      if (data) {
        await this.linkRelations(
          definition,
          id,
          relationIds(definition.fields, existing.data),
          relationIds(definition.fields, data),
        );
      }
      // Free links: the list is set as given, and symmetry is maintained on the
      // targets — same as relation fields.
      if (input.related) {
        await this.linkRelations(definition, id, existing.related ?? [], input.related);
      }
      return updated;
    } catch (error) {
      throw this.mapSlugConflict(error, definition.slug, input.slug ?? existing.slug);
    }
  }

  async removeEntry(id: string): Promise<void> {
    const existing = await this.entries.findById(id);
    if (!existing) throw new EntryNotFoundError(`entry not found: ${id}`);
    const definition = await this.getDefinition(existing.collectionId);
    // Remove the inverse links too.
    await this.linkRelations(definition, id, relationIds(definition.fields, existing.data), []);
    await this.entries.delete(id);
  }

  // ── Public payloads ────────────────────────────────────────────────────────

  /**
   * Hidden fields excluded; rich text resolved then STRINGIFIED; media fields
   * turned into arrays of media records.
   */
  private async resolveEntryData(
    definition: CollectionDefinition,
    entry: Entry,
  ): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {};
    for (const field of definition.fields) {
      if (field.hidden) continue; // iso legacy options.hidden
      const value = entry.data[field.name];
      if (value === undefined || value === null) {
        data[field.name] = value;
        continue;
      }
      switch (field.type) {
        case 'rich-text':
          data[field.name] = JSON.stringify(await this.resolveRichTextMedia(value));
          break;
        case 'steps': {
          const steps = Array.isArray(value) ? value : [];
          data[field.name] = await Promise.all(
            steps.map(async (step) => {
              const s = step as Record<string, unknown>;
              if (s.content == null) return s;
              return {
                ...s,
                content: JSON.stringify(await this.resolveRichTextMedia(s.content)),
              };
            }),
          );
          break;
        }
        case 'media': {
          const ids = Array.isArray(value) ? value : [value];
          const records = await Promise.all(
            ids
              .filter((v): v is string => typeof v === 'string' && v.length > 0)
              // Records come back sorted by id, NOT in the order of the field.
              .sort()
              .map((mediaId) => this.media.toLegacyMedia(mediaId)),
          );
          data[field.name] = records.filter((record) => record !== null);
          break;
        }
        default:
          data[field.name] = value;
      }
    }
    return data;
  }

  /** Image and file nodes get their `mediaRecord` and a resolved `src`. */
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
      const mediaRecord = await this.media.toLegacyMedia(attrs.id);
      copy.attrs = { ...attrs, mediaRecord, src: mediaRecord?.objects.original ?? null };
    }
    if (Array.isArray(copy.content)) {
      copy.content = await this.resolveRichTextMedia(copy.content);
    }
    return copy;
  }

  /** Events with no scheduled period are never published. */
  private hasEmptySchedules(entry: Entry): boolean {
    const schedules = (entry.data.schedules ?? entry.legacyExtra?.schedules) as
      | { periods?: unknown[] }
      | undefined;
    return schedules !== undefined && (schedules.periods?.length ?? 0) === 0;
  }

  /**
   * ONE flat map of every published entry across all collections, keyed by id.
   */
  async legacyRecordsPayload(): Promise<Record<string, Record<string, unknown>>> {
    const records: Record<string, Record<string, unknown>> = {};
    for (const definition of await this.definitions.list()) {
      const published = await this.entries.listPublished(definition.id);
      for (const entry of published) {
        if (definition.slug === 'events' && this.hasEmptySchedules(entry)) continue;
        // status is excluded from the public payload.
        records[entry.id] = {
          _id: entry.id,
          title: entry.title,
          slug: entry.slug,
          relatedCollection: definition.slug,
          // Omitted when absent — published entries without a stamp do exist.
          ...(entry.publishedAt != null ? { publishedAt: entry.publishedAt } : {}),
          ...(await this.resolveEntryData(definition, entry)),
          // AFTER the spread: wins over a data field of the same name.
          records: entry.related ?? [],
        };
      }
    }
    return records;
  }

  /** Public slugs of every published entry (`/collection/entry`), for the deployment payload. */
  async publishedSlugs(): Promise<string[]> {
    const slugs: string[] = [];
    for (const definition of await this.definitions.list()) {
      const published = await this.entries.listPublished(definition.id);
      // The empty-schedule filter applies ONLY TO
      // content/records — les slugs du deployment listent tout le publié.
      slugs.push(...published.map((entry) => `/${definition.slug}/${entry.slug}`));
    }
    return slugs;
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private mapSlugConflict(error: unknown, collectionSlug: string, entrySlug: string): unknown {
    if (
      error instanceof Error &&
      error.message.includes('UNIQUE constraint failed') &&
      error.message.includes('entries.slug')
    ) {
      return new DuplicateSlugError(
        `le slug "${entrySlug}" est déjà utilisé dans la collection ${collectionSlug}`,
      );
    }
    return error;
  }

  /** Iso legacy: suffixe incrémental -1/-2… jusqu'à unicité dans la collection. */
  private async uniqueEntrySlug(collectionId: string, base: string): Promise<string> {
    let candidate = base;
    for (let suffix = 1; await this.entries.findBySlug(collectionId, candidate); suffix++) {
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }

  private async uniqueDefinitionSlug(base: string): Promise<string> {
    let candidate = base;
    for (let suffix = 1; await this.definitions.findBySlug(candidate); suffix++) {
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }

  /** Iso legacy bidirectional `records[]`: maintain reverse links on targets. */
  private async linkRelations(
    definition: CollectionDefinition,
    entryId: string,
    before: string[],
    after: string[],
  ): Promise<void> {
    const added = after.filter((id) => !before.includes(id));
    const removed = before.filter((id) => !after.includes(id));
    for (const targetId of added) {
      const target = await this.entries.findById(targetId);
      if (!target) continue;
      const related = new Set(target.related ?? []);
      related.add(entryId);
      await this.entries.update(targetId, { related: [...related] });
    }
    for (const targetId of removed) {
      const target = await this.entries.findById(targetId);
      if (!target) continue;
      await this.entries.update(targetId, {
        related: (target.related ?? []).filter((id) => id !== entryId),
      });
    }
    void definition;
  }
}
