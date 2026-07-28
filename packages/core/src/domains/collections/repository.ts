import { and, desc, eq, sql } from 'drizzle-orm';
import type { StoreDb } from '../../infrastructure/db/index.ts';
import {
  collectionDefinitions,
  entries,
  type CollectionDefinition,
  type Entry,
  type NewCollectionDefinition,
  type NewEntry,
} from './schema.ts';

/**
 * All database access of the collections domain. Methods are async by
 * contract (layering decision) even though bun:sqlite executes synchronously.
 */
export class CollectionsRepository {
  constructor(private readonly db: StoreDb) {}

  // ── Definitions ────────────────────────────────────────────────────────────

  async listDefinitions(): Promise<CollectionDefinition[]> {
    return this.db.select().from(collectionDefinitions).all();
  }

  async findDefinitionBySlug(slug: string): Promise<CollectionDefinition | undefined> {
    return this.db
      .select()
      .from(collectionDefinitions)
      .where(eq(collectionDefinitions.slug, slug))
      .get();
  }

  async findDefinitionById(id: string): Promise<CollectionDefinition | undefined> {
    return this.db
      .select()
      .from(collectionDefinitions)
      .where(eq(collectionDefinitions.id, id))
      .get();
  }

  /** Résolution de l'injector APIDAE : la config référence l'ObjectId legacy. */
  async findDefinitionByLegacyId(legacyId: string): Promise<CollectionDefinition | undefined> {
    return this.db
      .select()
      .from(collectionDefinitions)
      .where(sql`json_extract(${collectionDefinitions.legacyExtra}, '$.legacyId') = ${legacyId}`)
      .get();
  }

  async insertDefinition(input: NewCollectionDefinition): Promise<CollectionDefinition> {
    return this.db.insert(collectionDefinitions).values(input).returning().get();
  }

  async updateDefinition(
    id: string,
    input: Partial<NewCollectionDefinition>,
  ): Promise<CollectionDefinition | undefined> {
    return this.db
      .update(collectionDefinitions)
      .set(input)
      .where(eq(collectionDefinitions.id, id))
      .returning()
      .get();
  }

  async deleteDefinition(id: string): Promise<CollectionDefinition | undefined> {
    return this.db
      .delete(collectionDefinitions)
      .where(eq(collectionDefinitions.id, id))
      .returning()
      .get();
  }

  // ── Entries ────────────────────────────────────────────────────────────────

  async listEntries(collectionId: string): Promise<Entry[]> {
    return this.db
      .select()
      .from(entries)
      .where(eq(entries.collectionId, collectionId))
      .orderBy(desc(entries.updatedAt))
      .all();
  }

  /** Iso legacy admin listing: tri updatedAt desc + skip/limit. */
  async listEntriesPaginated(
    collectionId: string,
    options: { skip: number; limit: number },
  ): Promise<Entry[]> {
    return this.db
      .select()
      .from(entries)
      .where(eq(entries.collectionId, collectionId))
      .orderBy(desc(entries.updatedAt))
      .limit(options.limit)
      .offset(options.skip)
      .all();
  }

  async findEntryBySlug(collectionId: string, slug: string): Promise<Entry | undefined> {
    return this.db
      .select()
      .from(entries)
      .where(and(eq(entries.collectionId, collectionId), eq(entries.slug, slug)))
      .get();
  }

  async listPublishedEntries(collectionId: string): Promise<Entry[]> {
    return (
      this.db
        .select()
        .from(entries)
        // Iso legacy : le plan public filtre sur le STATUT seul (publishedAt = horodatage).
        .where(and(eq(entries.collectionId, collectionId), eq(entries.status, 'published')))
        .orderBy(desc(entries.createdAt))
        .all()
    );
  }

  async findEntryById(id: string): Promise<Entry | undefined> {
    return this.db.select().from(entries).where(eq(entries.id, id)).get();
  }

  /** Idempotence de la sync APIDAE : retrouve une entrée par une clé de son data. */
  async findEntryByDataField(
    collectionId: string,
    name: string,
    value: string | number,
  ): Promise<Entry | undefined> {
    return this.db
      .select()
      .from(entries)
      .where(
        and(
          eq(entries.collectionId, collectionId),
          sql`json_extract(${entries.data}, ${`$.${name}`}) = ${value}`,
        ),
      )
      .get();
  }

  async insertEntry(input: NewEntry): Promise<Entry> {
    return this.db.insert(entries).values(input).returning().get();
  }

  async updateEntry(id: string, input: Partial<NewEntry>): Promise<Entry | undefined> {
    return this.db.update(entries).set(input).where(eq(entries.id, id)).returning().get();
  }

  async deleteEntry(id: string): Promise<Entry | undefined> {
    return this.db.delete(entries).where(eq(entries.id, id)).returning().get();
  }
}
