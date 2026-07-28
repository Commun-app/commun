// Catalogue d'erreurs typées du domaine organization (revue PR #1, 28/07).
import { createTypedError } from '../../common/errors/index.ts';

export const OrganizationNotInitializedError = createTypedError(
  'organization-not-initialized-error',
  'collectivité non initialisée',
  'NOT_FOUND',
);
export const OrganizationAlreadyInitializedError = createTypedError(
  'organization-already-initialized-error',
  'collectivité déjà initialisée',
  'BAD_REQUEST',
);
