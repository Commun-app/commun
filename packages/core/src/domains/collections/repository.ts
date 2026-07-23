import { and, desc, eq } from 'drizzle-orm';
import type { StoreDb } from '../../infrastructure/db/index.ts';
import { publishedWhere } from '../../infrastructure/db/helpers.ts';
import {
  collectionDefinitions,
  collectionEntries,
  type CollectionDefinition,
  type CollectionEntry,
  type NewCollectionDefinition,
  type NewCollectionEntry,
} from './schema.ts';

/** All database access of the collections domain. */
export class CollectionsRepository {
  constructor(private readonly db: StoreDb) {}

  // ── Definitions ────────────────────────────────────────────────────────────

  listDefinitions(): CollectionDefinition[] {
    return this.db.select().from(collectionDefinitions).all();
  }

  findDefinitionBySlug(slug: string): CollectionDefinition | undefined {
    return this.db
      .select()
      .from(collectionDefinitions)
      .where(eq(collectionDefinitions.slug, slug))
      .get();
  }

  findDefinitionById(id: string): CollectionDefinition | undefined {
    return this.db
      .select()
      .from(collectionDefinitions)
      .where(eq(collectionDefinitions.id, id))
      .get();
  }

  insertDefinition(input: NewCollectionDefinition): CollectionDefinition {
    return this.db.insert(collectionDefinitions).values(input).returning().get();
  }

  updateDefinition(
    id: string,
    input: Partial<NewCollectionDefinition>,
  ): CollectionDefinition | undefined {
    return this.db
      .update(collectionDefinitions)
      .set(input)
      .where(eq(collectionDefinitions.id, id))
      .returning()
      .get();
  }

  deleteDefinition(id: string): CollectionDefinition | undefined {
    return this.db
      .delete(collectionDefinitions)
      .where(eq(collectionDefinitions.id, id))
      .returning()
      .get();
  }

  // ── Entries ────────────────────────────────────────────────────────────────

  listEntries(collectionId: string): CollectionEntry[] {
    return this.db
      .select()
      .from(collectionEntries)
      .where(eq(collectionEntries.collectionId, collectionId))
      .orderBy(desc(collectionEntries.createdAt))
      .all();
  }

  listPublishedEntries(collectionId: string, now: string): CollectionEntry[] {
    return this.db
      .select()
      .from(collectionEntries)
      .where(
        and(
          eq(collectionEntries.collectionId, collectionId),
          publishedWhere(collectionEntries, now),
        ),
      )
      .orderBy(desc(collectionEntries.createdAt))
      .all();
  }

  findEntryById(id: string): CollectionEntry | undefined {
    return this.db.select().from(collectionEntries).where(eq(collectionEntries.id, id)).get();
  }

  insertEntry(input: NewCollectionEntry): CollectionEntry {
    return this.db.insert(collectionEntries).values(input).returning().get();
  }

  updateEntry(id: string, input: Partial<NewCollectionEntry>): CollectionEntry | undefined {
    return this.db
      .update(collectionEntries)
      .set(input)
      .where(eq(collectionEntries.id, id))
      .returning()
      .get();
  }

  deleteEntry(id: string): CollectionEntry | undefined {
    return this.db.delete(collectionEntries).where(eq(collectionEntries.id, id)).returning().get();
  }
}
