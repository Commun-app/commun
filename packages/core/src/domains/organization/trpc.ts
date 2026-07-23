import { adminProcedure, protectedProcedure, router } from '../../infrastructure/trpc/index.ts';
import { organizationInitDto, organizationUpdateDto } from './dto.ts';

// Transport layer only: every handler delegates to the OrganizationService.
export const organizationRouter = router({
  get: protectedProcedure.query(({ ctx }) => ctx.services.organization.get()),
  init: adminProcedure
    .input(organizationInitDto)
    .mutation(({ ctx, input }) => ctx.services.organization.init(input)),
  update: adminProcedure
    .input(organizationUpdateDto)
    .mutation(({ ctx, input }) => ctx.services.organization.update(input)),
});
