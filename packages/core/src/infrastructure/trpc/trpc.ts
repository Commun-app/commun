import { initTRPC, TRPCError } from '@trpc/server';
import type { CoreContext } from '../../common/types/core.ts';
import { CommunError } from '../../common/errors/index.ts';
import { newId } from '../../common/utils/id.ts';
import { runWithCorrelation, traced } from '../../common/observability/index.ts';

export const t = initTRPC.context<CoreContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

/**
 * Bind a fresh correlation id to the async context for the whole request and
 * trace the transport boundary, so every service/infra call nests under one id.
 */
export const correlation = middleware(({ path, type, next }) =>
  runWithCorrelation(newId(), () =>
    traced({ layer: 'transport', component: 'trpc', method: `${type} ${path}` }, [], () => next()),
  ),
);

/**
 * Translate domain errors thrown by services into typed tRPC errors. In tRPC
 * v11, `next()` returns a MiddlewareResult discriminated by `ok`; thrown
 * errors are surfaced in `result.error.cause`.
 */
export const errorMapper = middleware(async ({ next }) => {
  const result = await next();
  if (!result.ok) {
    const cause = result.error.cause;
    if (cause instanceof CommunError) {
      throw new TRPCError({
        code: mapErrorCode(cause.code),
        message: cause.message,
        cause,
      });
    }
  }
  return result;
});

export const procedure = publicProcedure.use(correlation).use(errorMapper);

function mapErrorCode(code: string): TRPCError['code'] {
  switch (code) {
    case 'NOT_FOUND':
      return 'NOT_FOUND';
    case 'INVALID_STATE':
      return 'BAD_REQUEST';
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
}
