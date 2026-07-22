import { z } from 'zod';
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
import {
  collectionDefinitionCreateSchema,
  collectionDefinitionUpdateSchema,
  collectionEntryCreateSchema,
  collectionEntryUpdateSchema,
} from './validation.ts';

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
