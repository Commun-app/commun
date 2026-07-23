import { z } from 'zod';
import { protectedProcedure, router } from '../../infrastructure/trpc/index.ts';
import { mediaUpdateSchema } from './validation.ts';

// Transport layer only — iso legacy upload flow: requestUpload (pre-signed
// PUT URL) → direct client upload to S3 → finalize (records the row).
export const mediaRouter = router({
  requestUpload: protectedProcedure
    .input(z.object({ filename: z.string().min(1), mime: z.string().min(1) }))
    .mutation(({ ctx, input }) => ctx.services.media.requestUpload(input.filename, input.mime)),
  finalize: protectedProcedure
    .input(
      z.object({
        key: z.string().min(1),
        filename: z.string().min(1),
        mime: z.string().min(1),
        alt: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) => ctx.services.media.finalize(input)),
  list: protectedProcedure.query(({ ctx }) => ctx.services.media.list()),
  update: protectedProcedure
    .input(z.object({ id: z.string(), data: mediaUpdateSchema }))
    .mutation(({ ctx, input }) => ctx.services.media.updateEditorial(input.id, input.data)),
  remove: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await ctx.services.media.remove(input.id);
    return { removed: input.id };
  }),
});
