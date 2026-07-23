import { z } from 'zod';
import { protectedProcedure, router } from '../../infrastructure/trpc/index.ts';
import { mediaUpdateSchema } from './validation.ts';

// Transport layer only: upload goes through the REST route (multipart), the
// rest delegates to the MediaService.
export const mediaRouter = router({
  list: protectedProcedure.query(({ ctx }) => ctx.services.media.list()),
  update: protectedProcedure
    .input(z.object({ id: z.string(), data: mediaUpdateSchema }))
    .mutation(({ ctx, input }) => ctx.services.media.updateEditorial(input.id, input.data)),
  remove: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await ctx.services.media.remove(input.id);
    return { removed: input.id };
  }),
});
