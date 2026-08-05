import {
  DeployFailedError,
  DeployHookMissingError,
  OrganizationAlreadyInitializedError,
  OrganizationNotInitializedError,
} from './errors.ts';
import type { OrganizationRepository } from './repository.ts';
import type { Organization } from './schema.ts';
import type { OrganizationInitDto, OrganizationUpdateDto } from './dtos/index.ts';

// The hook answers in seconds; a bound is what keeps a hung call from hanging
// the caller — the legacy job had none and swallowed the error.
const DEPLOY_TIMEOUT_MS = 30_000;

/** Instance settings — a singleton: initialised once, then only updated. */
export class OrganizationService {
  constructor(
    private readonly repository: OrganizationRepository,
    private readonly options: { fetchImpl?: typeof fetch } = {},
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

  /** Triggers the site build through the configured deploy hook. */
  async deploy(): Promise<{ status: number }> {
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
        `deploy hook unreachable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (!response.ok) {
      throw new DeployFailedError(`deploy hook: ${response.status} ${response.statusText}`);
    }
    return { status: response.status };
  }
}
