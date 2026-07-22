import { eq } from 'drizzle-orm';
import { CommunError, ERR } from '../../common/errors/index.ts';
import type { StoreDb } from '../../infrastructure/db/index.ts';
import { adminProcedure, protectedProcedure, router } from '../../infrastructure/trpc/index.ts';
import { collectivite, type Collectivite } from './schema.ts';
import { collectiviteInitSchema, collectiviteUpdateSchema } from './validation.ts';

/** The singleton settings row, or null before initialisation. */
export function getCollectivite(db: StoreDb): Collectivite | null {
  return db.select().from(collectivite).where(eq(collectivite.id, 1)).get() ?? null;
}

export const collectiviteRouter = router({
  get: protectedProcedure.query(({ ctx }) => getCollectivite(ctx.db)),

  /** First-time initialisation — refused once the singleton exists. */
  init: adminProcedure.input(collectiviteInitSchema).mutation(({ ctx, input }) => {
    if (getCollectivite(ctx.db)) {
      throw new CommunError(ERR.INVALID_STATE, 'la collectivité est déjà initialisée');
    }
    return ctx.db.insert(collectivite).values({ ...input, id: 1 }).returning().get();
  }),

  update: adminProcedure.input(collectiviteUpdateSchema).mutation(({ ctx, input }) => {
    const updated = ctx.db
      .update(collectivite)
      .set(input)
      .where(eq(collectivite.id, 1))
      .returning()
      .get();
    if (!updated) throw new CommunError(ERR.NOT_FOUND, 'collectivité non initialisée');
    return updated;
  }),
});
