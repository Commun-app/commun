/**
 * Typed domain errors. Each domain exports its own catalogue
 * (`domains/<domain>/errors.ts`); the tRPC layer only forwards them —
 * `trpcCode` carries the transport code, `type` the client-readable
 * discriminant the UI matches on.
 */
export const TRPC_CODES = {
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export type TrpcErrorCode = (typeof TRPC_CODES)[keyof typeof TRPC_CODES];

/** Base class — lets the tRPC mapper test `instanceof DomainError`. */
export abstract class DomainError extends Error {
  abstract readonly type: string;
  abstract readonly trpcCode: TrpcErrorCode;
}

/**
 * A type and a transport code fully identify an error; the message is optional
 * context for logs, never user-facing copy — the interface owns the wording.
 *
 *   export const EntryNotFoundError = createTypedError(
 *     'entry-not-found-error', TRPC_CODES.NOT_FOUND);
 *   throw new EntryNotFoundError(`entry not found: ${id}`);
 */
export function createTypedError(type: string, trpcCode: TrpcErrorCode) {
  return class extends DomainError {
    readonly type = type;
    readonly trpcCode = trpcCode;
    constructor(message?: string) {
      super(message ?? type);
      this.name = type;
    }
  };
}
