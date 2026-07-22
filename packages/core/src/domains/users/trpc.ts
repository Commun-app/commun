import { TRPCError } from '@trpc/server';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  adminProcedure,
  procedure,
  protectedProcedure,
  router,
} from '../../infrastructure/trpc/index.ts';
import { acceptInvitation, createInvitation, login, revokeSession } from './auth.ts';
import { createApiToken, revokeApiToken } from './tokens.ts';
import { apiTokens, users } from './schema.ts';

const publicUser = ({ id, email, name, role }: typeof users.$inferSelect) => ({
  id,
  email,
  name,
  role,
});

export const authRouter = router({
  /** Login — poses the httpOnly session cookie via the adapter. */
  login: procedure
    .input(z.object({ email: z.email(), password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await login(ctx.db, input.email, input.password);
      if (!result) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'identifiants invalides' });
      ctx.cookies.set(result.token, result.session.expiresAt);
      return { user: publicUser(result.session.user) };
    }),

  logout: protectedProcedure.mutation(({ ctx }) => {
    revokeSession(ctx.db, ctx.session.sessionId);
    ctx.cookies.clear();
    return { loggedOut: true };
  }),

  me: protectedProcedure.query(({ ctx }) => ({ user: publicUser(ctx.session.user) })),

  /** Consume an invitation link and set the password (public, single-use). */
  acceptInvitation: procedure
    .input(z.object({ token: z.string().min(1), name: z.string().min(1), password: z.string().min(10) }))
    .mutation(async ({ ctx, input }) => {
      const user = await acceptInvitation(ctx.db, input.token, input);
      return { user: publicUser(user) };
    }),
});

export const usersRouter = router({
  list: adminProcedure.query(({ ctx }) =>
    ctx.db.select().from(users).all().map(publicUser),
  ),

  /** Invite a new member — the single-use link is returned to the admin. */
  invite: adminProcedure
    .input(z.object({ email: z.email(), role: z.enum(['admin', 'redacteur']) }))
    .mutation(({ ctx, input }) => createInvitation(ctx.db, input)),

  remove: adminProcedure.input(z.object({ id: z.string() })).mutation(({ ctx, input }) => {
    if (input.id === ctx.session.user.id) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'impossible de supprimer son propre compte' });
    }
    ctx.db.delete(users).where(eq(users.id, input.id)).run();
    return { removed: input.id };
  }),
});

export const apiTokensRouter = router({
  list: adminProcedure.query(({ ctx }) =>
    ctx.db
      .select({
        id: apiTokens.id,
        name: apiTokens.name,
        lastUsedAt: apiTokens.lastUsedAt,
        revokedAt: apiTokens.revokedAt,
        createdAt: apiTokens.createdAt,
      })
      .from(apiTokens)
      .orderBy(desc(apiTokens.createdAt))
      .all(),
  ),

  /** The plaintext token is returned ONCE — only its hash is stored. */
  create: adminProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(({ ctx, input }) => {
      const { token, record } = createApiToken(ctx.db, input.name);
      return { token, id: record.id, name: record.name };
    }),

  revoke: adminProcedure.input(z.object({ id: z.string() })).mutation(({ ctx, input }) => {
    revokeApiToken(ctx.db, input.id);
    return { revoked: input.id };
  }),
});
