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
export const DeployHookMissingError = createTypedError(
  'deploy-hook-missing-error',
  'E_NO_DEPLOY_HOOK — aucun hook de déploiement configuré (organization.deployment.vercel.hook)',
  'BAD_REQUEST',
);
export const DeployFailedError = createTypedError(
  'deploy-failed-error',
  'le déclenchement du déploiement a échoué',
  'INTERNAL_SERVER_ERROR',
);
