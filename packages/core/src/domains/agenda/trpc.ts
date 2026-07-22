import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { CommunError, ERR } from '../../common/errors/index.ts';
import type { StoreDb } from '../../infrastructure/db/index.ts';
import { publishedWhere } from '../../infrastructure/db/helpers.ts';
import { protectedProcedure, router } from '../../infrastructure/trpc/index.ts';
import { evenements, type Evenement } from './schema.ts';
import { evenementCreateSchema, evenementUpdateSchema } from './validation.ts';

export function listPublishedEvenements(db: StoreDb, now?: string): Evenement[] {
  return db
    .select()
    .from(evenements)
    .where(publishedWhere(evenements, now))
    .orderBy(desc(evenements.startAt))
    .all();
}

export const agendaRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db.select().from(evenements).orderBy(desc(evenements.startAt)).all(),
  ),
  get: protectedProcedure.input(z.object({ id: z.string() })).query(({ ctx, input }) => {
    const found = ctx.db.select().from(evenements).where(eq(evenements.id, input.id)).get();
    if (!found) throw new CommunError(ERR.NOT_FOUND, `événement introuvable: ${input.id}`);
    return found;
  }),
  create: protectedProcedure.input(evenementCreateSchema).mutation(({ ctx, input }) =>
    ctx.db.insert(evenements).values(input).returning().get(),
  ),
  update: protectedProcedure
    .input(z.object({ id: z.string(), data: evenementUpdateSchema }))
    .mutation(({ ctx, input }) => {
      const updated = ctx.db
        .update(evenements)
        .set(input.data)
        .where(eq(evenements.id, input.id))
        .returning()
        .get();
      if (!updated) throw new CommunError(ERR.NOT_FOUND, `événement introuvable: ${input.id}`);
      return updated;
    }),
  remove: protectedProcedure.input(z.object({ id: z.string() })).mutation(({ ctx, input }) => {
    const removed = ctx.db
      .delete(evenements)
      .where(eq(evenements.id, input.id))
      .returning()
      .get();
    if (!removed) throw new CommunError(ERR.NOT_FOUND, `événement introuvable: ${input.id}`);
    return { removed: input.id };
  }),
});
