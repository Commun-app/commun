import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { CommunError, ERR } from '../../common/errors/index.ts';
import type { StoreDb } from '../../infrastructure/db/index.ts';
import { publishedWhere } from '../../infrastructure/db/helpers.ts';
import { buildDataSchema, type FieldDefinition } from './fields.ts';
import {
  collectionDefinitions,
  collectionEntries,
  type CollectionDefinition,
  type CollectionEntry,
} from './schema.ts';
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

export function listDefinitions(db: StoreDb): CollectionDefinition[] {
  return db.select().from(collectionDefinitions).all();
}

export function getDefinition(db: StoreDb, idOrSlug: string): CollectionDefinition {
  const bySlug = db
    .select()
    .from(collectionDefinitions)
    .where(eq(collectionDefinitions.slug, idOrSlug))
    .get();
  const found =
    bySlug ??
    db.select().from(collectionDefinitions).where(eq(collectionDefinitions.id, idOrSlug)).get();
  if (!found) throw new CommunError(ERR.NOT_FOUND, `collection introuvable: ${idOrSlug}`);
  return found;
}

export function createDefinition(db: StoreDb, input: DefinitionCreate): CollectionDefinition {
  return db.insert(collectionDefinitions).values(input).returning().get();
}

export function updateDefinition(
  db: StoreDb,
  id: string,
  input: DefinitionUpdate,
): CollectionDefinition {
  const updated = db
    .update(collectionDefinitions)
    .set(input)
    .where(eq(collectionDefinitions.id, id))
    .returning()
    .get();
  if (!updated) throw new CommunError(ERR.NOT_FOUND, `collection introuvable: ${id}`);
  return updated;
}

export function removeDefinition(db: StoreDb, id: string): void {
  const removed = db
    .delete(collectionDefinitions)
    .where(eq(collectionDefinitions.id, id))
    .returning()
    .get();
  if (!removed) throw new CommunError(ERR.NOT_FOUND, `collection introuvable: ${id}`);
}

/** Validate an entry's `data` against its collection's generated Zod schema. */
function validateData(definition: CollectionDefinition, data: Record<string, unknown>) {
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

export function listEntries(db: StoreDb, collectionId: string): CollectionEntry[] {
  return db
    .select()
    .from(collectionEntries)
    .where(eq(collectionEntries.collectionId, collectionId))
    .orderBy(desc(collectionEntries.createdAt))
    .all();
}

/** Public plane: published entries of a collection, resolved by slug or id. */
export function listPublishedEntries(
  db: StoreDb,
  collectionSlug: string,
  now?: string,
): CollectionEntry[] {
  const definition = getDefinition(db, collectionSlug);
  return db
    .select()
    .from(collectionEntries)
    .where(
      and(eq(collectionEntries.collectionId, definition.id), publishedWhere(collectionEntries, now)),
    )
    .orderBy(desc(collectionEntries.createdAt))
    .all();
}

export function createEntry(db: StoreDb, collectionId: string, input: EntryCreate): CollectionEntry {
  const definition = getDefinition(db, collectionId);
  const data = validateData(definition, input.data);
  try {
    return db
      .insert(collectionEntries)
      .values({ ...input, data, collectionId: definition.id })
      .returning()
      .get();
  } catch (error) {
    throw mapSlugConflict(error, definition.slug, input.slug);
  }
}

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

export function updateEntry(db: StoreDb, id: string, input: EntryUpdate): CollectionEntry {
  const existing = db.select().from(collectionEntries).where(eq(collectionEntries.id, id)).get();
  if (!existing) throw new CommunError(ERR.NOT_FOUND, `entrée introuvable: ${id}`);
  const definition = getDefinition(db, existing.collectionId);
  const data = input.data ? validateData(definition, input.data) : undefined;
  try {
    return db
      .update(collectionEntries)
      .set({ ...input, ...(data ? { data } : {}) })
      .where(eq(collectionEntries.id, id))
      .returning()
      .get()!;
  } catch (error) {
    throw mapSlugConflict(error, definition.slug, input.slug ?? existing.slug);
  }
}

export function removeEntry(db: StoreDb, id: string): void {
  const removed = db.delete(collectionEntries).where(eq(collectionEntries.id, id)).returning().get();
  if (!removed) throw new CommunError(ERR.NOT_FOUND, `entrée introuvable: ${id}`);
}
