import { eq } from 'drizzle-orm';
import { CommunError, ERR } from '../../common/errors/index.ts';
import type { StoreDb } from '../../infrastructure/db/index.ts';
import { adminProcedure, protectedProcedure, router } from '../../infrastructure/trpc/index.ts';
import { organization, type Organization } from './schema.ts';
import { organizationInitSchema, organizationUpdateSchema } from './validation.ts';

/** The singleton settings row, or null before initialisation. */
export function getOrganization(db: StoreDb): Organization | null {
  return db.select().from(organization).where(eq(organization.id, 1)).get() ?? null;
}

export const organizationRouter = router({
  get: protectedProcedure.query(({ ctx }) => getOrganization(ctx.db)),

  /** First-time initialisation — refused once the singleton exists. */
  init: adminProcedure.input(organizationInitSchema).mutation(({ ctx, input }) => {
    if (getOrganization(ctx.db)) {
      throw new CommunError(ERR.INVALID_STATE, 'la collectivité est déjà initialisée');
    }
    return ctx.db.insert(organization).values({ ...input, id: 1 }).returning().get();
  }),

  update: adminProcedure.input(organizationUpdateSchema).mutation(({ ctx, input }) => {
    const updated = ctx.db
      .update(organization)
      .set(input)
      .where(eq(organization.id, 1))
      .returning()
      .get();
    if (!updated) throw new CommunError(ERR.NOT_FOUND, 'collectivité non initialisée');
    return updated;
  }),
});
