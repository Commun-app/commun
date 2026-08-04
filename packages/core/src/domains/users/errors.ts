// Catalogue d'erreurs typées du domaine users (revue PR #1, 28/07).
import { createTypedError } from '../../common/errors/index.ts';

export const UserNotFoundError = createTypedError(
  'user-not-found-error',
  'utilisateur introuvable',
  'NOT_FOUND',
);
export const SessionNotFoundError = createTypedError(
  'session-not-found-error',
  'session introuvable',
  'NOT_FOUND',
);
export const InvitationInvalidError = createTypedError(
  'invitation-invalid-error',
  'invitation invalide ou expirée',
  'BAD_REQUEST',
);
export const CannotRemoveSelfError = createTypedError(
  'cannot-remove-self-error',
  'impossible de supprimer son propre compte',
  'BAD_REQUEST',
);

/**
 * Trop de tentatives de connexion sur un MÊME compte. Distinct d'un échec
 * d'identifiants : le compte existe peut-être, mais on refuse d'essayer.
 */
export const TooManyAttemptsError = createTypedError(
  'too-many-attempts-error',
  'trop de tentatives, réessayez dans quelques minutes',
  'TOO_MANY_REQUESTS',
);
