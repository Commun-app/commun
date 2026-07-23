import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  adminProcedure,
  procedure,
  protectedProcedure,
  router,
} from '../../infrastructure/trpc/index.ts';
import type { users } from './schema.ts';

const publicUser = ({ id, email, name, role }: typeof users.$inferSelect) => ({
  id,
  email,
  name,
  role,
});

// Transport layer only: every handler delegates to the UsersService.
export const authRouter = router({
  /** Login — iso legacy: the opaque token is returned in the body, the client
   * sends it back as `Authorization: Bearer <token>`. No cookies. */
  login: procedure
    .input(z.object({ email: z.email(), password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.services.users.login(input.email, input.password);
      if (!result) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'identifiants invalides' });
      return {
        token: result.token,
        expiresAt: result.session.expiresAt,
        user: publicUser(result.session.user),
      };
    }),

  logout: protectedProcedure.mutation(({ ctx }) => {
    ctx.services.users.revokeSession(ctx.session.sessionId);
    return { loggedOut: true };
  }),

  me: protectedProcedure.query(({ ctx }) => ({ user: publicUser(ctx.session.user) })),

  /** Device management — legacy `account/me` sessions parity. */
  sessions: router({
    list: protectedProcedure.query(({ ctx }) =>
      ctx.services.users.listSessions(ctx.session.user.id, ctx.session.sessionId),
    ),
    revoke: protectedProcedure.input(z.object({ id: z.string() })).mutation(({ ctx, input }) => {
      ctx.services.users.revokeOwnSession(ctx.session.user.id, input.id);
      return { revoked: input.id };
    }),
  }),

  /** Consume an invitation link and set the password (public, single-use). */
  acceptInvitation: procedure
    .input(z.object({ token: z.string().min(1), name: z.string().min(1), password: z.string().min(10) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.services.users.acceptInvitation(input.token, input);
      return { user: publicUser(user) };
    }),
});

export const usersRouter = router({
  list: adminProcedure.query(({ ctx }) => ctx.services.users.listUsers().map(publicUser)),

  /** Invite a new member — the single-use link is returned to the admin. */
  invite: adminProcedure
    .input(z.object({ email: z.email(), role: z.enum(['admin', 'redacteur']) }))
    .mutation(({ ctx, input }) => ctx.services.users.createInvitation(input)),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({ name: z.string().min(1).optional(), role: z.enum(['admin', 'redacteur']).optional() }),
      }),
    )
    .mutation(({ ctx, input }) => publicUser(ctx.services.users.updateUser(input.id, input.data))),

  remove: adminProcedure.input(z.object({ id: z.string() })).mutation(({ ctx, input }) => {
    ctx.services.users.removeUser(ctx.session.user.id, input.id);
    return { removed: input.id };
  }),
});

export const apiTokensRouter = router({
  list: adminProcedure.query(({ ctx }) => ctx.services.users.listApiTokens()),

  /** The plaintext token is returned ONCE — only its hash is stored. */
  create: adminProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(({ ctx, input }) => {
      const { token, record } = ctx.services.users.createApiToken(input.name);
      return { token, id: record.id, name: record.name };
    }),

  revoke: adminProcedure.input(z.object({ id: z.string() })).mutation(({ ctx, input }) => {
    ctx.services.users.revokeApiToken(input.id);
    return { revoked: input.id };
  }),
});
