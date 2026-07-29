import {
  DeployFailedError,
  DeployHookMissingError,
  OrganizationAlreadyInitializedError,
  OrganizationNotInitializedError,
} from './errors.ts';
import type { OrganizationRepository } from './repository.ts';
import type { Organization } from './schema.ts';
import type { OrganizationInitDto, OrganizationUpdateDto } from './dtos/index.ts';

// Borné : le hook Vercel répond en quelques secondes (le job legacy n'avait
// AUCUN timeout et avalait les erreurs — sortie toujours en succès).
const DEPLOY_TIMEOUT_MS = 30_000;

/** Instance settings — a singleton: initialised once, then only updated. */
export class OrganizationService {
  constructor(
    private readonly repository: OrganizationRepository,
    private readonly options: { fetchImpl?: typeof fetch; jobsDisabled?: boolean } = {},
  ) {}

  async get(): Promise<Organization | null> {
    return (await this.repository.get()) ?? null;
  }

  /** First-time initialisation — refused once the singleton exists. */
  async init(input: OrganizationInitDto): Promise<Organization> {
    if (await this.repository.get()) {
      throw new OrganizationAlreadyInitializedError();
    }
    return this.repository.insert(input);
  }

  async update(input: OrganizationUpdateDto, actorId?: string): Promise<Organization> {
    const updated = await this.repository.update({ ...input, updatedBy: actorId ?? null });
    if (!updated) throw new OrganizationNotInitializedError();
    return updated;
  }

  /**
   * Déclenche le build du site : GET sur le hook Vercel stocké dans
   * `deployment.vercel.hook`. Appelé par la tâche Nitro `deploy` (cron
   * quotidien) et la procédure tRPC `organization.deploy` (bouton Publier).
   */
  async deploy(): Promise<{ status?: number; skipped?: string }> {
    // Mode ombre (silent-migration) : aucune émission, même via le bouton
    // Publier — le hook en base pointe sur le Vercel de TEST pendant
    // l'observation, piloté par le pipeline de resync.
    if (this.options.jobsDisabled) {
      return { skipped: 'shadow-mode' };
    }
    const organization = await this.get();
    const deployment = organization?.deployment as
      | { vercel?: { hook?: string } }
      | null
      | undefined;
    const hook = deployment?.vercel?.hook;
    if (!hook) throw new DeployHookMissingError();

    const fetchImpl = this.options.fetchImpl ?? fetch;
    let response: Response;
    try {
      response = await fetchImpl(hook, { signal: AbortSignal.timeout(DEPLOY_TIMEOUT_MS) });
    } catch (error) {
      throw new DeployFailedError(
        `hook Vercel injoignable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (!response.ok) {
      throw new DeployFailedError(`hook Vercel: ${response.status} ${response.statusText}`);
    }
    return { status: response.status };
  }
}
