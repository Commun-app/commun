import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { CommunError, ERR } from '../../common/errors/index.ts';
import type { StoreDb } from '../../infrastructure/db/index.ts';
import { adminProcedure, protectedProcedure, router } from '../../infrastructure/trpc/index.ts';
import { buildDataSchema, type FieldDefinition } from '../collections/fields.ts';
import { formulaires, soumissions, type Formulaire, type Soumission } from './schema.ts';
import { formulaireCreateSchema, formulaireUpdateSchema } from './validation.ts';

/** Active forms exposed on the public plane (definition only, for rendering). */
export function listActiveFormulaires(db: StoreDb): Formulaire[] {
  return db.select().from(formulaires).where(eq(formulaires.active, true)).all();
}

/**
 * Public submission path (used by the REST plane): validates `data` against
 * the form's field definitions before persisting.
 */
export function submitFormulaire(
  db: StoreDb,
  slug: string,
  data: Record<string, unknown>,
): Soumission {
  const form = db.select().from(formulaires).where(eq(formulaires.slug, slug)).get();
  if (!form || !form.active) throw new CommunError(ERR.NOT_FOUND, `formulaire introuvable: ${slug}`);
  const schema = buildDataSchema(form.fields as FieldDefinition[]);
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new CommunError(ERR.INVALID_STATE, `soumission invalide: ${parsed.error.message}`);
  }
  return db
    .insert(soumissions)
    .values({ formulaireId: form.id, data: parsed.data })
    .returning()
    .get();
}

export const formulairesRouter = router({
  list: protectedProcedure.query(({ ctx }) => ctx.db.select().from(formulaires).all()),
  create: adminProcedure.input(formulaireCreateSchema).mutation(({ ctx, input }) =>
    ctx.db.insert(formulaires).values(input).returning().get(),
  ),
  update: adminProcedure
    .input(z.object({ id: z.string(), data: formulaireUpdateSchema }))
    .mutation(({ ctx, input }) => {
      const updated = ctx.db
        .update(formulaires)
        .set(input.data)
        .where(eq(formulaires.id, input.id))
        .returning()
        .get();
      if (!updated) throw new CommunError(ERR.NOT_FOUND, `formulaire introuvable: ${input.id}`);
      return updated;
    }),
  remove: adminProcedure.input(z.object({ id: z.string() })).mutation(({ ctx, input }) => {
    const removed = ctx.db
      .delete(formulaires)
      .where(eq(formulaires.id, input.id))
      .returning()
      .get();
    if (!removed) throw new CommunError(ERR.NOT_FOUND, `formulaire introuvable: ${input.id}`);
    return { removed: input.id };
  }),

  soumissions: router({
    list: protectedProcedure
      .input(z.object({ formulaireId: z.string().optional() }))
      .query(({ ctx, input }) => {
        const base = ctx.db.select().from(soumissions).orderBy(desc(soumissions.createdAt));
        return input.formulaireId
          ? base.where(eq(soumissions.formulaireId, input.formulaireId)).all()
          : base.all();
      }),
    markTraitee: protectedProcedure.input(z.object({ id: z.string() })).mutation(({ ctx, input }) => {
      const updated = ctx.db
        .update(soumissions)
        .set({ status: 'traitee' })
        .where(eq(soumissions.id, input.id))
        .returning()
        .get();
      if (!updated) throw new CommunError(ERR.NOT_FOUND, `soumission introuvable: ${input.id}`);
      return updated;
    }),
  }),
});
