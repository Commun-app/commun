import { adminProcedure, protectedProcedure, router } from '../../infrastructure/trpc/index.ts';
import { organizationInitDto, organizationUpdateDto } from './dtos/index.ts';

// Transport layer only: every handler delegates to the OrganizationService.
export const organizationRouter = router({
  get: protectedProcedure.query(({ ctx }) => ctx.services.organization.get()),
  init: adminProcedure
    .input(organizationInitDto)
    .mutation(({ ctx, input }) => ctx.services.organization.init(input)),
  update: adminProcedure
    .input(organizationUpdateDto)
    .mutation(({ ctx, input }) => ctx.services.organization.update(input, ctx.session.user.id)),
  // Bouton « Publier » de l'admin : déclenche le build Vercel (admin ET
  // rédacteur — iso legacy, publier fait partie du flux éditorial).
  deploy: protectedProcedure.mutation(({ ctx }) => ctx.services.organization.deploy()),
});
