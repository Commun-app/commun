import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  adminProcedure,
  procedure,
  protectedProcedure,
  router,
} from '../../infrastructure/trpc/index.ts';
import {
  acceptInvitationDto,
  apiTokenCreateDto,
  inviteDto,
  loginDto,
  requestPasswordResetDto,
  toPublicUser,
  userUpdateDto,
} from './dtos/index.ts';

// Transport layer only: every handler delegates to the UsersService, inputs
// and outputs go through the domain DTOs.
export const authRouter = router({
  /** Login — iso legacy: the opaque token is returned in the body, the client
   * sends it back as `Authorization: Bearer <token>`. No cookies. */
  login: procedure.input(loginDto).mutation(async ({ ctx, input }) => {
    const result = await ctx.services.users.login(input.email, input.password, ctx.requestMeta);
    if (!result) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'invalid credentials' });
    return {
      token: result.token,
      expiresAt: result.session.expiresAt,
      user: toPublicUser(result.session.user),
    };
  }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.services.users.revokeSession(ctx.session.sessionId);
    return { loggedOut: true };
  }),

  me: protectedProcedure.query(({ ctx }) => ({ user: toPublicUser(ctx.session.user) })),

  /** Device management — legacy `account/me` sessions parity. */
  sessions: router({
    list: protectedProcedure.query(({ ctx }) =>
      ctx.services.users.listSessions(ctx.session.user.id, ctx.session.sessionId),
    ),
    revoke: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await ctx.services.users.revokeOwnSession(ctx.session.user.id, input.id);
        return { revoked: input.id };
      }),
  }),

  /** Consume an invitation link and set the password (public, single-use). */
  acceptInvitation: procedure.input(acceptInvitationDto).mutation(async ({ ctx, input }) => {
    const user = await ctx.services.users.acceptInvitation(input.token, input);
    return { user: toPublicUser(user) };
  }),

  /**
   * « Mot de passe oublié » (9.9) — public, réponse TOUJOURS { ok: true }
   * (pas d'oracle d'énumération) ; l'email ne part que si le compte existe.
   */
  requestPasswordReset: procedure
    .input(requestPasswordResetDto)
    .mutation(async ({ ctx, input }) => {
      await ctx.services.users.requestPasswordReset(input.email);
      return { ok: true };
    }),
});

export const usersRouter = router({
  list: adminProcedure.query(async ({ ctx }) =>
    (await ctx.services.users.listUsers()).map(toPublicUser),
  ),

  /**
   * Annuaire {id, name} accessible à tout membre connecté — iso legacy :
   * l'admin affiche « modifié par <nom> » sur les fiches, y compris pour
   * un rédacteur (qui n'a pas accès à users.list).
   */
  directory: protectedProcedure.query(async ({ ctx }) =>
    (await ctx.services.users.listUsers()).map(({ id, name }) => ({ id, name })),
  ),

  /** Iso legacy: lecture unitaire. */
  get: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => toPublicUser(await ctx.services.users.getUser(input.id))),

  /** Invite a new member — the single-use link is returned to the admin. */
  invite: adminProcedure
    .input(inviteDto)
    .mutation(({ ctx, input }) => ctx.services.users.createInvitation(input)),

  update: adminProcedure
    .input(userUpdateDto)
    .mutation(async ({ ctx, input }) =>
      toPublicUser(await ctx.services.users.updateUser(input.id, input.data)),
    ),

  remove: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await ctx.services.users.removeUser(ctx.session.user.id, input.id);
    return { removed: input.id };
  }),
});

export const apiTokensRouter = router({
  list: adminProcedure.query(({ ctx }) => ctx.services.users.listApiTokens()),

  /** The plaintext token is returned ONCE — only its hash is stored. */
  create: adminProcedure.input(apiTokenCreateDto).mutation(async ({ ctx, input }) => {
    const { token, record } = await ctx.services.users.createApiToken(input.name);
    return { token, id: record.id, name: record.name };
  }),

  revoke: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await ctx.services.users.revokeApiToken(input.id);
    return { revoked: input.id };
  }),
});
