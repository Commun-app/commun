import { initTRPC, TRPCError } from '@trpc/server';
import type { CoreContext } from '../../common/types/core.ts';
import { DomainError } from '../../common/errors/index.ts';

export const t = initTRPC.context<CoreContext>().create({
  /**
   * Exposes the error TYPE to the client. The interface matches on
   * `error.data.type`, never on the message — that is the whole contract.
   */
  errorFormatter({ shape, error }) {
    const cause = error.cause;
    return {
      ...shape,
      data: {
        ...shape.data,
        ...(cause instanceof DomainError ? { type: cause.type } : {}),
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

/** Forwards domain errors, converting `trpcCode` into a transport code. */
export const errorMapper = middleware(async ({ next }) => {
  const result = await next();
  if (!result.ok) {
    const cause = result.error.cause;
    if (cause instanceof DomainError) {
      throw new TRPCError({ code: cause.trpcCode, message: cause.message, cause });
    }
  }
  return result;
});

export const procedure = publicProcedure.use(errorMapper);

/** The single access middleware: session, and optionally role. */
const requireSession = (role?: 'admin') =>
  middleware(({ ctx, next }) => {
    if (!ctx.session) throw new TRPCError({ code: 'UNAUTHORIZED' });
    if (role && ctx.session.user.role !== role) throw new TRPCError({ code: 'FORBIDDEN' });
    return next({ ctx: { ...ctx, session: ctx.session } });
  });

/** Requires an authenticated session, whatever the role. */
export const protectedProcedure = procedure.use(requireSession());

/** Requires an authenticated admin. */
export const adminProcedure = procedure.use(requireSession('admin'));
