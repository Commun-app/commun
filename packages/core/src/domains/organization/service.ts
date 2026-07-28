import { OrganizationAlreadyInitializedError, OrganizationNotInitializedError } from './errors.ts';
import type { OrganizationRepository } from './repository.ts';
import type { Organization } from './schema.ts';
import type { OrganizationInitDto, OrganizationUpdateDto } from './dtos/index.ts';

/** Instance settings — a singleton: initialised once, then only updated. */
export class OrganizationService {
  constructor(private readonly repository: OrganizationRepository) {}

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
}
