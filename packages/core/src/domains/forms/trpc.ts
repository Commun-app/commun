import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { CommunError, ERR } from '../../common/errors/index.ts';
import type { StoreDb } from '../../infrastructure/db/index.ts';
import { adminProcedure, protectedProcedure, router } from '../../infrastructure/trpc/index.ts';
import { buildDataSchema, type FieldDefinition } from '../collections/fields.ts';
import { forms, formSubmissions, type Form, type FormSubmission } from './schema.ts';
import { formCreateSchema, formUpdateSchema } from './validation.ts';

/** Active forms exposed on the public plane (definition only, for rendering). */
export function listActiveForms(db: StoreDb): Form[] {
  return db.select().from(forms).where(eq(forms.active, true)).all();
}

/**
 * Public submission path (used by the REST plane): validates `data` against
 * the form's field definitions before persisting.
 */
export function submitForm(
  db: StoreDb,
  slug: string,
  data: Record<string, unknown>,
): FormSubmission {
  const form = db.select().from(forms).where(eq(forms.slug, slug)).get();
  if (!form || !form.active) throw new CommunError(ERR.NOT_FOUND, `formulaire introuvable: ${slug}`);
  const schema = buildDataSchema(form.fields as FieldDefinition[]);
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new CommunError(ERR.INVALID_STATE, `soumission invalide: ${parsed.error.message}`);
  }
  return db.insert(formSubmissions).values({ formId: form.id, data: parsed.data }).returning().get();
}

export const formsRouter = router({
  list: protectedProcedure.query(({ ctx }) => ctx.db.select().from(forms).all()),
  create: adminProcedure.input(formCreateSchema).mutation(({ ctx, input }) =>
    ctx.db.insert(forms).values(input).returning().get(),
  ),
  update: adminProcedure
    .input(z.object({ id: z.string(), data: formUpdateSchema }))
    .mutation(({ ctx, input }) => {
      const updated = ctx.db
        .update(forms)
        .set(input.data)
        .where(eq(forms.id, input.id))
        .returning()
        .get();
      if (!updated) throw new CommunError(ERR.NOT_FOUND, `formulaire introuvable: ${input.id}`);
      return updated;
    }),
  remove: adminProcedure.input(z.object({ id: z.string() })).mutation(({ ctx, input }) => {
    const removed = ctx.db.delete(forms).where(eq(forms.id, input.id)).returning().get();
    if (!removed) throw new CommunError(ERR.NOT_FOUND, `formulaire introuvable: ${input.id}`);
    return { removed: input.id };
  }),

  submissions: router({
    list: protectedProcedure
      .input(z.object({ formId: z.string().optional() }))
      .query(({ ctx, input }) => {
        const base = ctx.db.select().from(formSubmissions).orderBy(desc(formSubmissions.createdAt));
        return input.formId ? base.where(eq(formSubmissions.formId, input.formId)).all() : base.all();
      }),
    markProcessed: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(({ ctx, input }) => {
        const updated = ctx.db
          .update(formSubmissions)
          .set({ status: 'processed' })
          .where(eq(formSubmissions.id, input.id))
          .returning()
          .get();
        if (!updated) throw new CommunError(ERR.NOT_FOUND, `soumission introuvable: ${input.id}`);
        return updated;
      }),
  }),
});
