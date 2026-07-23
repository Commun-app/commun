import { desc, eq } from 'drizzle-orm';
import type { StoreDb } from '../../infrastructure/db/index.ts';
import { media, type Media, type NewMedia } from './schema.ts';

/** All database access of the media domain. */
export class MediaRepository {
  constructor(private readonly db: StoreDb) {}

  insert(input: NewMedia): Media {
    return this.db.insert(media).values(input).returning().get();
  }

  findById(id: string): Media | undefined {
    return this.db.select().from(media).where(eq(media.id, id)).get();
  }

  list(): Media[] {
    return this.db.select().from(media).orderBy(desc(media.createdAt)).all();
  }

  update(
    id: string,
    input: Partial<Pick<Media, 'alt' | 'caption' | 'filename' | 'objects'>>,
  ): Media | undefined {
    return this.db.update(media).set(input).where(eq(media.id, id)).returning().get();
  }

  delete(id: string): void {
    this.db.delete(media).where(eq(media.id, id)).run();
  }
}
