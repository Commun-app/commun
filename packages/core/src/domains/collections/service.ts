import { z } from 'zod';
import {
  CollectionNotFoundError,
  DuplicateSlugError,
  EntryNotFoundError,
  InvalidEntryDataError,
} from './errors.ts';
import { slugify } from '../../common/utils/slug.ts';
import type { CollectionsRepository } from './repository.ts';
import type { MediaService } from '../media/service.ts';
import type { CollectionDefinition, Entry, FieldDefinition, FieldType } from './schema.ts';
import type {
  DefinitionCreateDto,
  DefinitionUpdateDto,
  EntryCreateDto,
  EntryUpdateDto,
} from './dtos/index.ts';

// Steps are rich objects, served as-is.
const stepSchema = z.record(z.string(), z.unknown());

const FIELD_VALUE_SCHEMAS: Record<FieldType, z.ZodType> = {
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
    if (!found) throw new CollectionNotFoundError(`collection not found: ${idOrSlug}`);
    return found;
  }

  async createDefinition(
    input: DefinitionCreateDto,
    actorId?: string,
  ): Promise<CollectionDefinition> {
    return this.repository.insertDefinition({
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
    const updated = await this.repository.updateDefinition(id, {
      ...input,
      updatedBy: actorId ?? null,
    });
    if (!updated) throw new CollectionNotFoundError(`collection not found: ${id}`);
    return updated;
  }

  async removeDefinition(id: string): Promise<void> {
    if (!(await this.repository.deleteDefinition(id))) {
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
    return this.repository.listEntries((await this.getDefinition(collectionIdOrSlug)).id);
  }

  async getEntry(id: string): Promise<Entry> {
    const found = await this.repository.findEntryById(id);
    if (!found) throw new EntryNotFoundError(`entry not found: ${id}`);
    return found;
  }

  /** Paginated admin listing, most recently updated first. */
  async listEntriesPaginated(
    collectionIdOrSlug: string,
    options: { skip?: number; limit?: number } = {},
  ): Promise<Entry[]> {
    const definition = await this.getDefinition(collectionIdOrSlug);
    return this.repository.listEntriesPaginated(definition.id, {
      skip: options.skip ?? 0,
      limit: options.limit ?? 20,
    });
  }

  async listPublishedEntries(collectionIdOrSlug: string): Promise<Entry[]> {
    return this.repository.listPublishedEntries((await this.getDefinition(collectionIdOrSlug)).id);
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
    const entry = await this.repository.insertEntry({
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
    const existing = await this.repository.findEntryById(id);
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
      const updated = (await this.repository.updateEntry(id, patch))!;
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
    const existing = await this.repository.findEntryById(id);
    if (!existing) throw new EntryNotFoundError(`entry not found: ${id}`);
    const definition = await this.getDefinition(existing.collectionId);
    // Remove the inverse links too.
    await this.linkRelations(definition, id, relationIds(definition.fields, existing.data), []);
    await this.repository.deleteEntry(id);
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
    for (const definition of await this.repository.listDefinitions()) {
      const published = await this.repository.listPublishedEntries(definition.id);
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
    for (const definition of await this.repository.listDefinitions()) {
      const published = await this.repository.listPublishedEntries(definition.id);
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
    for (let suffix = 1; await this.repository.findEntryBySlug(collectionId, candidate); suffix++) {
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }

  private async uniqueDefinitionSlug(base: string): Promise<string> {
    let candidate = base;
    for (let suffix = 1; await this.repository.findDefinitionBySlug(candidate); suffix++) {
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
      const target = await this.repository.findEntryById(targetId);
      if (!target) continue;
      const related = new Set(target.related ?? []);
      related.add(entryId);
      await this.repository.updateEntry(targetId, { related: [...related] });
    }
    for (const targetId of removed) {
      const target = await this.repository.findEntryById(targetId);
      if (!target) continue;
      await this.repository.updateEntry(targetId, {
        related: (target.related ?? []).filter((id) => id !== entryId),
      });
    }
    void definition;
  }
}
