import { and, desc, eq, sql } from 'drizzle-orm';
import type { StoreDb } from '../../../infrastructure/db/index.ts';
import { entries, type Entry, type NewEntry } from '../schema.ts';

/**
 * Database access for collection entries. Methods are async by contract, even
 * though bun:sqlite executes synchronously.
 */
export class EntryRepository {
  constructor(private readonly db: StoreDb) {}

  async list(collectionId: string): Promise<Entry[]> {
    return this.db
      .select()
      .from(entries)
      .where(eq(entries.collectionId, collectionId))
      .orderBy(desc(entries.updatedAt))
      .all();
  }

  /** Admin listing: most recently updated first, paginated. */
  async listPaginated(
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

  async listPublished(collectionId: string): Promise<Entry[]> {
    return (
      this.db
        .select()
        .from(entries)
        // The public plane filters on STATUS alone — publishedAt is just a stamp.
        .where(and(eq(entries.collectionId, collectionId), eq(entries.status, 'published')))
        .orderBy(desc(entries.createdAt))
        .all()
    );
  }

  async findBySlug(collectionId: string, slug: string): Promise<Entry | undefined> {
    return this.db
      .select()
      .from(entries)
      .where(and(eq(entries.collectionId, collectionId), eq(entries.slug, slug)))
      .get();
  }

  async findById(id: string): Promise<Entry | undefined> {
    return this.db.select().from(entries).where(eq(entries.id, id)).get();
  }

  /** Finds an entry by a key of its data — what makes the APIDAE sync idempotent. */
  async findByDataField(
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

  async insert(input: NewEntry): Promise<Entry> {
    return this.db.insert(entries).values(input).returning().get();
  }

  async update(id: string, input: Partial<NewEntry>): Promise<Entry | undefined> {
    return this.db.update(entries).set(input).where(eq(entries.id, id)).returning().get();
  }

  async delete(id: string): Promise<Entry | undefined> {
    return this.db.delete(entries).where(eq(entries.id, id)).returning().get();
  }
}
