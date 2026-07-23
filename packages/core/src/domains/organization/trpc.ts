import { adminProcedure, protectedProcedure, router } from '../../infrastructure/trpc/index.ts';
import { organizationInitSchema, organizationUpdateSchema } from './validation.ts';

// Transport layer only: every handler delegates to the OrganizationService.
export const organizationRouter = router({
  get: protectedProcedure.query(({ ctx }) => ctx.services.organization.get()),
  init: adminProcedure
    .input(organizationInitSchema)
    .mutation(({ ctx, input }) => ctx.services.organization.init(input)),
  update: adminProcedure
    .input(organizationUpdateSchema)
    .mutation(({ ctx, input }) => ctx.services.organization.update(input)),
});
