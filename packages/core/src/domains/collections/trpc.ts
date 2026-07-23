import { z } from 'zod';
import { adminProcedure, protectedProcedure, router } from '../../infrastructure/trpc/index.ts';
import {
  definitionCreateDto,
  definitionUpdateDto,
  entryCreateDto,
  entryUpdateDto,
} from './dtos/index.ts';

// Transport layer only: every handler delegates to the CollectionsService.
export const collectionsRouter = router({
  // Definition management is admin-only — it shapes the content model.
  list: protectedProcedure.query(({ ctx }) => ctx.services.collections.listDefinitions()),
  get: protectedProcedure
    .input(z.object({ idOrSlug: z.string() }))
    .query(({ ctx, input }) => ctx.services.collections.getDefinition(input.idOrSlug)),
  create: adminProcedure
    .input(definitionCreateDto)
    .mutation(({ ctx, input }) => ctx.services.collections.createDefinition(input)),
  update: adminProcedure
    .input(z.object({ id: z.string(), data: definitionUpdateDto }))
    .mutation(({ ctx, input }) => ctx.services.collections.updateDefinition(input.id, input.data)),
  remove: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await ctx.services.collections.removeDefinition(input.id);
    return { removed: input.id };
  }),

  entries: router({
    list: protectedProcedure
      .input(z.object({ collectionId: z.string() }))
      .query(({ ctx, input }) => ctx.services.collections.listEntries(input.collectionId)),
    create: protectedProcedure
      .input(z.object({ collectionId: z.string(), data: entryCreateDto }))
      .mutation(({ ctx, input }) =>
        ctx.services.collections.createEntry(input.collectionId, input.data),
      ),
    update: protectedProcedure
      .input(z.object({ id: z.string(), data: entryUpdateDto }))
      .mutation(({ ctx, input }) => ctx.services.collections.updateEntry(input.id, input.data)),
    remove: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await ctx.services.collections.removeEntry(input.id);
        return { removed: input.id };
      }),
  }),
});
