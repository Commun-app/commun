import { eq, sql } from 'drizzle-orm';
import type { StoreDb } from '../../../infrastructure/db/index.ts';
import {
  collectionDefinitions,
  type CollectionDefinition,
  type NewCollectionDefinition,
} from '../schema.ts';

/**
 * Database access for collection definitions. Methods are async by contract,
 * even though bun:sqlite executes synchronously.
 */
export class DefinitionRepository {
  constructor(private readonly db: StoreDb) {}

  async list(): Promise<CollectionDefinition[]> {
    return this.db.select().from(collectionDefinitions).all();
  }

  async findBySlug(slug: string): Promise<CollectionDefinition | undefined> {
    return this.db
      .select()
      .from(collectionDefinitions)
      .where(eq(collectionDefinitions.slug, slug))
      .get();
  }

  async findById(id: string): Promise<CollectionDefinition | undefined> {
    return this.db
      .select()
      .from(collectionDefinitions)
      .where(eq(collectionDefinitions.id, id))
      .get();
  }

  /** The APIDAE sync config references collections by their legacy id. */
  async findByLegacyId(legacyId: string): Promise<CollectionDefinition | undefined> {
    return this.db
      .select()
      .from(collectionDefinitions)
      .where(sql`json_extract(${collectionDefinitions.legacyExtra}, '$.legacyId') = ${legacyId}`)
      .get();
  }

  async insert(input: NewCollectionDefinition): Promise<CollectionDefinition> {
    return this.db.insert(collectionDefinitions).values(input).returning().get();
  }

  async update(
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

  async delete(id: string): Promise<CollectionDefinition | undefined> {
    return this.db
      .delete(collectionDefinitions)
      .where(eq(collectionDefinitions.id, id))
      .returning()
      .get();
  }
}
