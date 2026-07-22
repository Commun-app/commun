import { z } from 'zod';
import { protectedProcedure, router } from '../../infrastructure/trpc/index.ts';
import {
  createActualite,
  getActualite,
  listActualites,
  removeActualite,
  updateActualite,
} from './queries.ts';
import { actualiteCreateSchema, actualiteUpdateSchema } from './validation.ts';

export const actualitesRouter = router({
  list: protectedProcedure.query(({ ctx }) => listActualites(ctx.db)),
  get: protectedProcedure.input(z.object({ id: z.string() })).query(({ ctx, input }) =>
    getActualite(ctx.db, input.id),
  ),
  create: protectedProcedure.input(actualiteCreateSchema).mutation(({ ctx, input }) =>
    createActualite(ctx.db, input),
  ),
  update: protectedProcedure
    .input(z.object({ id: z.string(), data: actualiteUpdateSchema }))
    .mutation(({ ctx, input }) => updateActualite(ctx.db, input.id, input.data)),
  remove: protectedProcedure.input(z.object({ id: z.string() })).mutation(({ ctx, input }) => {
    removeActualite(ctx.db, input.id);
    return { removed: input.id };
  }),
});
