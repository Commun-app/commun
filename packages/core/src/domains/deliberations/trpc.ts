import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { CommunError, ERR } from '../../common/errors/index.ts';
import type { StoreDb } from '../../infrastructure/db/index.ts';
import { publishedWhere } from '../../infrastructure/db/helpers.ts';
import { protectedProcedure, router } from '../../infrastructure/trpc/index.ts';
import { deliberations, seances, type Deliberation, type Seance } from './schema.ts';
import {
  deliberationCreateSchema,
  deliberationUpdateSchema,
  seanceCreateSchema,
  seanceUpdateSchema,
} from './validation.ts';

export function listPublishedSeances(db: StoreDb, now?: string): Seance[] {
  return db
    .select()
    .from(seances)
    .where(publishedWhere(seances, now))
    .orderBy(desc(seances.date))
    .all();
}

/** Public plane: published deliberations joined with their (published) seance. */
export function listPublishedDeliberations(
  db: StoreDb,
  now?: string,
): Array<Deliberation & { seance: Seance }> {
  return db
    .select({ deliberation: deliberations, seance: seances })
    .from(deliberations)
    .innerJoin(seances, eq(seances.id, deliberations.seanceId))
    .where(publishedWhere(deliberations, now))
    .orderBy(desc(seances.date))
    .all()
    .map((row) => ({ ...row.deliberation, seance: row.seance }));
}

export const deliberationsRouter = router({
  seances: router({
    list: protectedProcedure.query(({ ctx }) =>
      ctx.db.select().from(seances).orderBy(desc(seances.date)).all(),
    ),
    get: protectedProcedure.input(z.object({ id: z.string() })).query(({ ctx, input }) => {
      const seance = ctx.db.select().from(seances).where(eq(seances.id, input.id)).get();
      if (!seance) throw new CommunError(ERR.NOT_FOUND, `séance introuvable: ${input.id}`);
      const items = ctx.db
        .select()
        .from(deliberations)
        .where(eq(deliberations.seanceId, input.id))
        .all();
      return { ...seance, deliberations: items };
    }),
    create: protectedProcedure.input(seanceCreateSchema).mutation(({ ctx, input }) =>
      ctx.db.insert(seances).values(input).returning().get(),
    ),
    update: protectedProcedure
      .input(z.object({ id: z.string(), data: seanceUpdateSchema }))
      .mutation(({ ctx, input }) => {
        const updated = ctx.db
          .update(seances)
          .set(input.data)
          .where(eq(seances.id, input.id))
          .returning()
          .get();
        if (!updated) throw new CommunError(ERR.NOT_FOUND, `séance introuvable: ${input.id}`);
        return updated;
      }),
    remove: protectedProcedure.input(z.object({ id: z.string() })).mutation(({ ctx, input }) => {
      const removed = ctx.db.delete(seances).where(eq(seances.id, input.id)).returning().get();
      if (!removed) throw new CommunError(ERR.NOT_FOUND, `séance introuvable: ${input.id}`);
      return { removed: input.id };
    }),
  }),

  create: protectedProcedure.input(deliberationCreateSchema).mutation(({ ctx, input }) => {
    const seance = ctx.db.select().from(seances).where(eq(seances.id, input.seanceId)).get();
    if (!seance) throw new CommunError(ERR.NOT_FOUND, `séance introuvable: ${input.seanceId}`);
    return ctx.db.insert(deliberations).values(input).returning().get();
  }),
  update: protectedProcedure
    .input(z.object({ id: z.string(), data: deliberationUpdateSchema }))
    .mutation(({ ctx, input }) => {
      const updated = ctx.db
        .update(deliberations)
        .set(input.data)
        .where(eq(deliberations.id, input.id))
        .returning()
        .get();
      if (!updated) throw new CommunError(ERR.NOT_FOUND, `délibération introuvable: ${input.id}`);
      return updated;
    }),
  remove: protectedProcedure.input(z.object({ id: z.string() })).mutation(({ ctx, input }) => {
    const removed = ctx.db
      .delete(deliberations)
      .where(eq(deliberations.id, input.id))
      .returning()
      .get();
    if (!removed) throw new CommunError(ERR.NOT_FOUND, `délibération introuvable: ${input.id}`);
    return { removed: input.id };
  }),
});
