import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { CommunError, ERR } from '../../common/errors/index.ts';
import type { StoreDb } from '../../infrastructure/db/index.ts';
import { publishedWhere } from '../../infrastructure/db/helpers.ts';
import { protectedProcedure, router } from '../../infrastructure/trpc/index.ts';
import {
  councilSessions,
  deliberations,
  type CouncilSession,
  type Deliberation,
} from './schema.ts';
import {
  councilSessionCreateSchema,
  councilSessionUpdateSchema,
  deliberationCreateSchema,
  deliberationUpdateSchema,
} from './validation.ts';

export function listPublishedCouncilSessions(db: StoreDb, now?: string): CouncilSession[] {
  return db
    .select()
    .from(councilSessions)
    .where(publishedWhere(councilSessions, now))
    .orderBy(desc(councilSessions.date))
    .all();
}

/** Public plane: published deliberations joined with their session. */
export function listPublishedDeliberations(
  db: StoreDb,
  now?: string,
): Array<Deliberation & { session: CouncilSession }> {
  return db
    .select({ deliberation: deliberations, session: councilSessions })
    .from(deliberations)
    .innerJoin(councilSessions, eq(councilSessions.id, deliberations.sessionId))
    .where(publishedWhere(deliberations, now))
    .orderBy(desc(councilSessions.date))
    .all()
    .map((row) => ({ ...row.deliberation, session: row.session }));
}

export const deliberationsRouter = router({
  sessions: router({
    list: protectedProcedure.query(({ ctx }) =>
      ctx.db.select().from(councilSessions).orderBy(desc(councilSessions.date)).all(),
    ),
    get: protectedProcedure.input(z.object({ id: z.string() })).query(({ ctx, input }) => {
      const session = ctx.db
        .select()
        .from(councilSessions)
        .where(eq(councilSessions.id, input.id))
        .get();
      if (!session) throw new CommunError(ERR.NOT_FOUND, `séance introuvable: ${input.id}`);
      const items = ctx.db
        .select()
        .from(deliberations)
        .where(eq(deliberations.sessionId, input.id))
        .all();
      return { ...session, deliberations: items };
    }),
    create: protectedProcedure.input(councilSessionCreateSchema).mutation(({ ctx, input }) =>
      ctx.db.insert(councilSessions).values(input).returning().get(),
    ),
    update: protectedProcedure
      .input(z.object({ id: z.string(), data: councilSessionUpdateSchema }))
      .mutation(({ ctx, input }) => {
        const updated = ctx.db
          .update(councilSessions)
          .set(input.data)
          .where(eq(councilSessions.id, input.id))
          .returning()
          .get();
        if (!updated) throw new CommunError(ERR.NOT_FOUND, `séance introuvable: ${input.id}`);
        return updated;
      }),
    remove: protectedProcedure.input(z.object({ id: z.string() })).mutation(({ ctx, input }) => {
      const removed = ctx.db
        .delete(councilSessions)
        .where(eq(councilSessions.id, input.id))
        .returning()
        .get();
      if (!removed) throw new CommunError(ERR.NOT_FOUND, `séance introuvable: ${input.id}`);
      return { removed: input.id };
    }),
  }),

  create: protectedProcedure.input(deliberationCreateSchema).mutation(({ ctx, input }) => {
    const session = ctx.db
      .select()
      .from(councilSessions)
      .where(eq(councilSessions.id, input.sessionId))
      .get();
    if (!session) throw new CommunError(ERR.NOT_FOUND, `séance introuvable: ${input.sessionId}`);
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
