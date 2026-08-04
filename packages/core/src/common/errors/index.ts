// Erreurs typées (revue PR #1, 28/07) : chaque domaine exporte son CATALOGUE
// d'erreurs (domains/<domain>/errors.ts) construit avec `createTypedError`.
// La couche tRPC ne fait que les transmettre : `error.trpcCode` porte le code
// transport, `error.type` le discriminant lisible côté client.

/** Codes transport tRPC portés par les erreurs de domaine. */
export type TrpcErrorCode =
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'UNAUTHORIZED'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_SERVER_ERROR';

/** Classe de base — permet `instanceof DomainError` dans le mapper tRPC. */
export abstract class DomainError extends Error {
  abstract readonly type: string;
  abstract readonly trpcCode: TrpcErrorCode;
}

/**
 * Fabrique d'erreur typée : classe avec discriminant `type` constant, message
 * par défaut et code transport. Usage :
 *
 *   export const EntryNotFoundError = createTypedError(
 *     'entry-not-found-error', 'entrée introuvable', 'NOT_FOUND');
 *   throw new EntryNotFoundError(`entrée introuvable: ${id}`);
 */
export function createTypedError(type: string, defaultMessage: string, trpcCode: TrpcErrorCode) {
  return class extends DomainError {
    readonly type = type;
    readonly trpcCode = trpcCode;
    constructor(message?: string) {
      super(message ?? defaultMessage);
      this.name = type;
    }
  };
}
