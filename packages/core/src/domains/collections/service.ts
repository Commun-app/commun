import { z } from 'zod';
import { CommunError, ERR } from '../../common/errors/index.ts';
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

const stepSchema = z.object({ title: z.string().optional(), content: z.unknown().optional() });

const FIELD_VALUE_SCHEMAS: Record<FieldType, z.ZodType> = {
  text: z.string(),
  'rich-text': z.record(z.string(), z.unknown()),
  number: z.number(),
  boolean: z.boolean(),
  date: z.iso.datetime({ offset: true }).or(z.iso.date()),
  media: z.string().or(z.array(z.string())), // media id(s) — iso legacy, un champ media peut être multiple
  relation: z.string().or(z.array(z.string())), // target entry id(s)
  select: z.string(),
  steps: z.array(stepSchema), // iso legacy array-of-steps
  // Iso legacy raw JSON : tout sauf undefined (le dump réel contient aussi des scalaires).
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
 * The content engine: collection definitions (closed field-type set) and
 * their entries, validated against the Zod schema generated from each
 * definition. Public payloads are served ISO legacy (signed media, stringified
 * rich text, hidden fields excluded).
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

  /** Paginated admin listing — iso legacy (skip/limit 20, tri updatedAt desc). */
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

  async listPublishedEntries(
    collectionIdOrSlug: string,
    now = new Date().toISOString(),
  ): Promise<Entry[]> {
    return this.repository.listPublishedEntries(
      (await this.getDefinition(collectionIdOrSlug)).id,
      now,
    );
  }

  async createEntry(
    collectionIdOrSlug: string,
    input: EntryCreateDto,
    actorId?: string,
  ): Promise<Entry> {
    const definition = await this.getDefinition(collectionIdOrSlug);
    const data = this.validateData(definition, input.data);
    // Iso legacy: slug généré depuis le titre (slugify fr) + unicité incrémentale -1/-2…
    const slug = await this.uniqueEntrySlug(definition.id, input.slug || slugify(input.title));
    const entry = await this.repository.insertEntry({
      ...input,
      slug,
      data,
      collectionId: definition.id,
      createdBy: actorId ?? null,
      updatedBy: actorId ?? null,
      // Iso legacy: publishedAt posé automatiquement à la publication.
      publishedAt:
        input.status === 'published'
          ? (input.publishedAt ?? new Date().toISOString())
          : input.publishedAt,
    });
    await this.linkRelations(definition, entry.id, [], relationIds(definition.fields, data));
    return entry;
  }

  /** Iso legacy: update PARTIEL — `data` est fusionné champ par champ avec l'existant. */
  async updateEntry(id: string, input: EntryUpdateDto, actorId?: string): Promise<Entry> {
    const existing = await this.repository.findEntryById(id);
    if (!existing) throw new CommunError(ERR.NOT_FOUND, `entrée introuvable: ${id}`);
    const definition = await this.getDefinition(existing.collectionId);

    const mergedData = input.data ? { ...existing.data, ...input.data } : existing.data;
    const data = input.data ? this.validateData(definition, mergedData) : undefined;

    const patch: Partial<Entry> = { ...input, updatedBy: actorId ?? null };
    if (data) patch.data = data;
    // Iso legacy: publishedAt posé au passage à published (si pas déjà tracé).
    if (input.status === 'published' && !existing.publishedAt && !input.publishedAt) {
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
      return updated;
    } catch (error) {
      throw this.mapSlugConflict(error, definition.slug, input.slug ?? existing.slug);
    }
  }

  async removeEntry(id: string): Promise<void> {
    const existing = await this.repository.findEntryById(id);
    if (!existing) throw new CommunError(ERR.NOT_FOUND, `entrée introuvable: ${id}`);
    const definition = await this.getDefinition(existing.collectionId);
    // Iso legacy: $pull inverse à la suppression.
    await this.linkRelations(definition, id, relationIds(definition.fields, existing.data), []);
    await this.repository.deleteEntry(id);
  }

  // ── Public payloads (iso legacy) ───────────────────────────────────────────

  /**
   * Iso legacy `parseDataAttributes`: hidden fields excluded, rich text
   * resolved (mediaRecord + signed src) then STRINGIFIED, steps content
   * resolved+stringified per step, media fields → arrays of signed legacy
   * media records.
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
              const s = step as { title?: string; content?: unknown };
              return {
                ...s,
                content:
                  s.content == null
                    ? s.content
                    : JSON.stringify(await this.resolveRichTextMedia(s.content)),
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

  /** Iso legacy `populateWysiwygMedia`: image/file nodes get `mediaRecord` + signed `src`. */
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

  /** Iso legacy: les events sans période d'agenda ne sont pas publiés. */
  private hasEmptySchedules(entry: Entry): boolean {
    const schedules = (entry.data.schedules ?? entry.legacyExtra?.schedules) as
      | { periods?: unknown[] }
      | undefined;
    return schedules !== undefined && (schedules.periods?.length ?? 0) === 0;
  }

  /**
   * Legacy-compat payload of `GET /api/v1/content/records`: ONE flat map of
   * every published entry across all collections, keyed by id.
   */
  async legacyRecordsPayload(): Promise<Record<string, Record<string, unknown>>> {
    const records: Record<string, Record<string, unknown>> = {};
    for (const definition of await this.repository.listDefinitions()) {
      const published = await this.repository.listPublishedEntries(
        definition.id,
        new Date().toISOString(),
      );
      for (const entry of published) {
        if (definition.slug === 'events' && this.hasEmptySchedules(entry)) continue;
        records[entry.id] = {
          _id: entry.id,
          title: entry.title,
          slug: entry.slug,
          relatedCollection: definition.slug,
          status: entry.status,
          publishedAt: entry.publishedAt,
          ...(await this.resolveEntryData(definition, entry)),
          // Iso legacy `records[]` (relations, entretenues bidirectionnellement) —
          // APRÈS le spread : prime sur un éventuel champ de données homonyme.
          records: entry.related ?? [],
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
      slugs.push(
        ...published
          .filter((entry) => !(definition.slug === 'events' && this.hasEmptySchedules(entry)))
          .map((entry) => `/${definition.slug}/${entry.slug}`),
      );
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
      return new CommunError(
        ERR.INVALID_STATE,
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
