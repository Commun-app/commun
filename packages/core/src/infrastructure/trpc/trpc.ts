import { initTRPC, TRPCError } from '@trpc/server';
import type { CoreContext } from '../../common/types/core.ts';
import { DomainError } from '../../common/errors/index.ts';

export const t = initTRPC.context<CoreContext>().create({
  /**
   * Expose le discriminant des erreurs typées au CLIENT : le front lit
   * `error.data.type` (ex : 'entry-not-found-error') et parse sans regex sur
   * les messages — c'est le contrat du dictionnaire d'erreurs côté UI.
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

/**
 * Transmet les erreurs typées des domaines (revue PR #1, 28/07) : chaque
 * domaine exporte son catalogue (`domains/<domain>/errors.ts`), la couche
 * tRPC ne fait que convertir `error.trpcCode` en code transport.
 */
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

/**
 * Middleware d'accès UNIQUE (revue PR #1) : vérifie la session et,
 * optionnellement, le rôle — `protectedProcedure` et `adminProcedure` n'en
 * sont que deux paramétrages.
 */
const requireSession = (role?: 'admin') =>
  middleware(({ ctx, next }) => {
    if (!ctx.session) throw new TRPCError({ code: 'UNAUTHORIZED' });
    if (role && ctx.session.user.role !== role) throw new TRPCError({ code: 'FORBIDDEN' });
    return next({ ctx: { ...ctx, session: ctx.session } });
  });

/** Requires an authenticated session (admin or rédacteur). */
export const protectedProcedure = procedure.use(requireSession());

/** Requires an authenticated admin. */
export const adminProcedure = procedure.use(requireSession('admin'));
