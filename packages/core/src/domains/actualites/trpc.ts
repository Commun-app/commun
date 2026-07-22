import { z } from 'zod';
import { procedure, router } from '../../infrastructure/trpc/index.ts';
import {
  createActualite,
  getActualite,
  listActualites,
  removeActualite,
  updateActualite,
} from './queries.ts';
import { actualiteCreateSchema, actualiteUpdateSchema } from './validation.ts';

// NOTE: session protection (`protected`/`adminOnly` middlewares) lands with the
// tenant-auth tasks (group 4) — every mutation below moves behind it then.
export const actualitesRouter = router({
  list: procedure.query(({ ctx }) => listActualites(ctx.db)),
  get: procedure.input(z.object({ id: z.string() })).query(({ ctx, input }) =>
    getActualite(ctx.db, input.id),
  ),
  create: procedure.input(actualiteCreateSchema).mutation(({ ctx, input }) =>
    createActualite(ctx.db, input),
  ),
  update: procedure
    .input(z.object({ id: z.string(), data: actualiteUpdateSchema }))
    .mutation(({ ctx, input }) => updateActualite(ctx.db, input.id, input.data)),
  remove: procedure.input(z.object({ id: z.string() })).mutation(({ ctx, input }) => {
    removeActualite(ctx.db, input.id);
    return { removed: input.id };
  }),
});
