import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { StoreDb } from '../../infrastructure/db/index.ts';
import { publishedWhere } from '../../infrastructure/db/helpers.ts';
import { adminProcedure, protectedProcedure, router } from '../../infrastructure/trpc/index.ts';
import {
  createDefinition,
  createEntry,
  getDefinition,
  listDefinitions,
  listEntries,
  removeDefinition,
  removeEntry,
  updateDefinition,
  updateEntry,
} from './queries.ts';
import { collectionEntries, type CollectionEntry } from './schema.ts';
import {
  collectionDefinitionCreateSchema,
  collectionDefinitionUpdateSchema,
  collectionEntryCreateSchema,
  collectionEntryUpdateSchema,
} from './validation.ts';

/** Public plane: published entries of a collection, resolved by slug. */
export function listPublishedEntries(
  db: StoreDb,
  collectionSlug: string,
  now?: string,
): CollectionEntry[] {
  const definition = getDefinition(db, collectionSlug);
  return db
    .select()
    .from(collectionEntries)
    .where(
      and(eq(collectionEntries.collectionId, definition.id), publishedWhere(collectionEntries, now)),
    )
    .all();
}

export const collectionsRouter = router({
  // Definition management is admin-only — it shapes the content model.
  list: protectedProcedure.query(({ ctx }) => listDefinitions(ctx.db)),
  get: protectedProcedure
    .input(z.object({ idOrSlug: z.string() }))
    .query(({ ctx, input }) => getDefinition(ctx.db, input.idOrSlug)),
  create: adminProcedure
    .input(collectionDefinitionCreateSchema)
    .mutation(({ ctx, input }) => createDefinition(ctx.db, input)),
  update: adminProcedure
    .input(z.object({ id: z.string(), data: collectionDefinitionUpdateSchema }))
    .mutation(({ ctx, input }) => updateDefinition(ctx.db, input.id, input.data)),
  remove: adminProcedure.input(z.object({ id: z.string() })).mutation(({ ctx, input }) => {
    removeDefinition(ctx.db, input.id);
    return { removed: input.id };
  }),

  entries: router({
    list: protectedProcedure
      .input(z.object({ collectionId: z.string() }))
      .query(({ ctx, input }) => listEntries(ctx.db, input.collectionId)),
    create: protectedProcedure
      .input(z.object({ collectionId: z.string(), data: collectionEntryCreateSchema }))
      .mutation(({ ctx, input }) => createEntry(ctx.db, input.collectionId, input.data)),
    update: protectedProcedure
      .input(z.object({ id: z.string(), data: collectionEntryUpdateSchema }))
      .mutation(({ ctx, input }) => updateEntry(ctx.db, input.id, input.data)),
    remove: protectedProcedure.input(z.object({ id: z.string() })).mutation(({ ctx, input }) => {
      removeEntry(ctx.db, input.id);
      return { removed: input.id };
    }),
  }),
});
