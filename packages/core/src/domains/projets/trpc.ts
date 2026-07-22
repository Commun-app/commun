import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { CommunError, ERR } from '../../common/errors/index.ts';
import type { StoreDb } from '../../infrastructure/db/index.ts';
import { publishedWhere } from '../../infrastructure/db/helpers.ts';
import { protectedProcedure, router } from '../../infrastructure/trpc/index.ts';
import { projets, type Projet } from './schema.ts';
import { projetCreateSchema, projetUpdateSchema } from './validation.ts';

export function listPublishedProjets(db: StoreDb, now?: string): Projet[] {
  return db
    .select()
    .from(projets)
    .where(publishedWhere(projets, now))
    .orderBy(desc(projets.createdAt))
    .all();
}

export const projetsRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db.select().from(projets).orderBy(desc(projets.createdAt)).all(),
  ),
  create: protectedProcedure.input(projetCreateSchema).mutation(({ ctx, input }) =>
    ctx.db.insert(projets).values(input).returning().get(),
  ),
  update: protectedProcedure
    .input(z.object({ id: z.string(), data: projetUpdateSchema }))
    .mutation(({ ctx, input }) => {
      const updated = ctx.db
        .update(projets)
        .set(input.data)
        .where(eq(projets.id, input.id))
        .returning()
        .get();
      if (!updated) throw new CommunError(ERR.NOT_FOUND, `projet introuvable: ${input.id}`);
      return updated;
    }),
  remove: protectedProcedure.input(z.object({ id: z.string() })).mutation(({ ctx, input }) => {
    const removed = ctx.db.delete(projets).where(eq(projets.id, input.id)).returning().get();
    if (!removed) throw new CommunError(ERR.NOT_FOUND, `projet introuvable: ${input.id}`);
    return { removed: input.id };
  }),
});
