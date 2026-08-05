import { createTypedError, TRPC_CODES } from '../../common/errors/index.ts';

export const OrganizationNotInitializedError = createTypedError(
  'organization-not-initialized-error',
  TRPC_CODES.NOT_FOUND,
);
export const OrganizationAlreadyInitializedError = createTypedError(
  'organization-already-initialized-error',
  TRPC_CODES.BAD_REQUEST,
);
export const DeployHookMissingError = createTypedError(
  'deploy-hook-missing-error',
  TRPC_CODES.BAD_REQUEST,
);
export const DeployFailedError = createTypedError(
  'deploy-failed-error',
  TRPC_CODES.INTERNAL_SERVER_ERROR,
);
