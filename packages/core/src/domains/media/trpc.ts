import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { CommunError, ERR } from '../../common/errors/index.ts';
import { protectedProcedure, router } from '../../infrastructure/trpc/index.ts';
import { removeMedia } from './service.ts';
import { media } from './schema.ts';
import { mediaUpdateSchema } from './validation.ts';

// Upload goes through the REST route (multipart) — tRPC covers the editorial
// surface and deletion (row + stored objects).
export const mediaRouter = router({
  remove: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await removeMedia(ctx.db, ctx.storage, input.id);
    return { removed: input.id };
  }),
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db.select().from(media).orderBy(desc(media.createdAt)).all(),
  ),
  update: protectedProcedure
    .input(z.object({ id: z.string(), data: mediaUpdateSchema }))
    .mutation(({ ctx, input }) => {
      const updated = ctx.db
        .update(media)
        .set(input.data)
        .where(eq(media.id, input.id))
        .returning()
        .get();
      if (!updated) throw new CommunError(ERR.NOT_FOUND, `média introuvable: ${input.id}`);
      return updated;
    }),
});
