import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { CommunError, ERR } from '../../common/errors/index.ts';
import { protectedProcedure, router } from '../../infrastructure/trpc/index.ts';
import { media } from './schema.ts';
import { mediaUpdateSchema } from './validation.ts';

// NOTE: upload (pre-signed URLs / local writes) and physical object deletion
// land with the media-storage tasks (group 5) — this router covers the
// library's editorial surface.
export const mediaRouter = router({
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
