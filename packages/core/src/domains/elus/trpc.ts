import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { CommunError, ERR } from '../../common/errors/index.ts';
import type { StoreDb } from '../../infrastructure/db/index.ts';
import { publishedWhere } from '../../infrastructure/db/helpers.ts';
import { protectedProcedure, router } from '../../infrastructure/trpc/index.ts';
import { elus, type Elu } from './schema.ts';
import { eluCreateSchema, eluUpdateSchema } from './validation.ts';

export function listPublishedElus(db: StoreDb, now?: string): Elu[] {
  return db
    .select()
    .from(elus)
    .where(publishedWhere(elus, now))
    .orderBy(asc(elus.sortOrder))
    .all();
}

export const elusRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db.select().from(elus).orderBy(asc(elus.sortOrder)).all(),
  ),
  create: protectedProcedure.input(eluCreateSchema).mutation(({ ctx, input }) =>
    ctx.db.insert(elus).values(input).returning().get(),
  ),
  update: protectedProcedure
    .input(z.object({ id: z.string(), data: eluUpdateSchema }))
    .mutation(({ ctx, input }) => {
      const updated = ctx.db
        .update(elus)
        .set(input.data)
        .where(eq(elus.id, input.id))
        .returning()
        .get();
      if (!updated) throw new CommunError(ERR.NOT_FOUND, `élu introuvable: ${input.id}`);
      return updated;
    }),
  remove: protectedProcedure.input(z.object({ id: z.string() })).mutation(({ ctx, input }) => {
    const removed = ctx.db.delete(elus).where(eq(elus.id, input.id)).returning().get();
    if (!removed) throw new CommunError(ERR.NOT_FOUND, `élu introuvable: ${input.id}`);
    return { removed: input.id };
  }),
});
