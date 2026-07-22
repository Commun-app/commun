import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { CommunError, ERR } from '../../common/errors/index.ts';
import type { StoreDb } from '../../infrastructure/db/index.ts';
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
    .all();
}

export function createEntry(db: StoreDb, collectionId: string, input: EntryCreate): CollectionEntry {
  const definition = getDefinition(db, collectionId);
  const data = validateData(definition, input.data);
  return db
    .insert(collectionEntries)
    .values({ ...input, data, collectionId: definition.id })
    .returning()
    .get();
}

export function updateEntry(db: StoreDb, id: string, input: EntryUpdate): CollectionEntry {
  const existing = db.select().from(collectionEntries).where(eq(collectionEntries.id, id)).get();
  if (!existing) throw new CommunError(ERR.NOT_FOUND, `entrée introuvable: ${id}`);
  const definition = getDefinition(db, existing.collectionId);
  const data = input.data ? validateData(definition, input.data) : undefined;
  return db
    .update(collectionEntries)
    .set({ ...input, ...(data ? { data } : {}) })
    .where(eq(collectionEntries.id, id))
    .returning()
    .get()!;
}

export function removeEntry(db: StoreDb, id: string): void {
  const removed = db.delete(collectionEntries).where(eq(collectionEntries.id, id)).returning().get();
  if (!removed) throw new CommunError(ERR.NOT_FOUND, `entrée introuvable: ${id}`);
}
