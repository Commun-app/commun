import { createTypedError, TRPC_CODES } from '../../common/errors/index.ts';

export const UserNotFoundError = createTypedError('user-not-found-error', TRPC_CODES.NOT_FOUND);
export const SessionNotFoundError = createTypedError(
  'session-not-found-error',
  TRPC_CODES.NOT_FOUND,
);
export const InvitationInvalidError = createTypedError(
  'invitation-invalid-error',
  TRPC_CODES.BAD_REQUEST,
);
export const CannotRemoveSelfError = createTypedError(
  'cannot-remove-self-error',
  TRPC_CODES.BAD_REQUEST,
);

/** Throttled on ONE account — distinct from bad credentials: we refuse to try. */
export const TooManyAttemptsError = createTypedError(
  'too-many-attempts-error',
  TRPC_CODES.TOO_MANY_REQUESTS,
);
