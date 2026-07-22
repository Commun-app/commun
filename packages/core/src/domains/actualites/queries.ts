import { and, desc, eq, isNull, lte, or } from 'drizzle-orm';
import type { z } from 'zod';
import { CommunError, ERR } from '../../common/errors/index.ts';
import type { StoreDb } from '../../infrastructure/db/index.ts';
import { actualites, type Actualite } from './schema.ts';
import type { actualiteCreateSchema, actualiteUpdateSchema } from './validation.ts';

type ActualiteCreate = z.infer<typeof actualiteCreateSchema>;
type ActualiteUpdate = z.infer<typeof actualiteUpdateSchema>;

export function listActualites(db: StoreDb): Actualite[] {
  return db.select().from(actualites).orderBy(desc(actualites.createdAt)).all();
}

/**
 * Published plane: only rows with status=published whose publishedAt is unset
 * or in the past (scheduled publication — spec: core-domains).
 */
export function listPublishedActualites(db: StoreDb, now = new Date().toISOString()): Actualite[] {
  return db
    .select()
    .from(actualites)
    .where(
      and(
        eq(actualites.status, 'published'),
        // publishedAt unset → visible dès publication ; sinon visible à échéance
        or(isNull(actualites.publishedAt), lte(actualites.publishedAt, now)),
      ),
    )
    .orderBy(desc(actualites.createdAt))
    .all();
}

export function getActualite(db: StoreDb, id: string): Actualite {
  const found = db.select().from(actualites).where(eq(actualites.id, id)).get();
  if (!found) throw new CommunError(ERR.NOT_FOUND, `actualité introuvable: ${id}`);
  return found;
}

export function createActualite(db: StoreDb, input: ActualiteCreate): Actualite {
  return db.insert(actualites).values(input).returning().get();
}

export function updateActualite(db: StoreDb, id: string, input: ActualiteUpdate): Actualite {
  const updated = db
    .update(actualites)
    .set(input)
    .where(eq(actualites.id, id))
    .returning()
    .get();
  if (!updated) throw new CommunError(ERR.NOT_FOUND, `actualité introuvable: ${id}`);
  return updated;
}

export function removeActualite(db: StoreDb, id: string): void {
  const removed = db.delete(actualites).where(eq(actualites.id, id)).returning().get();
  if (!removed) throw new CommunError(ERR.NOT_FOUND, `actualité introuvable: ${id}`);
}
