import { desc, eq, sql } from 'drizzle-orm';
import type { StoreDb } from '../../infrastructure/db/index.ts';
import { media, type Media, type NewMedia } from './schema.ts';

/**
 * All database access of the media domain. Methods are async by contract
 * even though bun:sqlite executes synchronously.
 */
export class MediaRepository {
  constructor(private readonly db: StoreDb) {}

  async insert(input: NewMedia): Promise<Media> {
    return this.db.insert(media).values(input).returning().get();
  }

  async findById(id: string): Promise<Media | undefined> {
    return this.db.select().from(media).where(eq(media.id, id)).get();
  }

  async list(): Promise<Media[]> {
    return this.db.select().from(media).orderBy(desc(media.createdAt)).all();
  }

  /** Idempotence de la sync APIDAE : retrouve un média par une clé de son metaData. */
  async findByMetaData(name: string, value: string): Promise<Media | undefined> {
    return this.db
      .select()
      .from(media)
      .where(sql`json_extract(${media.metaData}, ${`$.${name}`}) = ${value}`)
      .get();
  }

  async update(
    id: string,
    input: Partial<
      Pick<Media, 'alt' | 'caption' | 'filename' | 'metaData' | 'objects' | 'updatedBy'>
    >,
  ): Promise<Media | undefined> {
    return this.db.update(media).set(input).where(eq(media.id, id)).returning().get();
  }

  async delete(id: string): Promise<void> {
    this.db.delete(media).where(eq(media.id, id)).run();
  }
}
