import type { z } from 'zod';
import { CommunError, ERR } from '../../common/errors/index.ts';
import type { OrganizationRepository } from './repository.ts';
import type { Organization } from './schema.ts';
import type { organizationInitSchema, organizationUpdateSchema } from './validation.ts';

type OrganizationInit = z.infer<typeof organizationInitSchema>;
type OrganizationUpdate = z.infer<typeof organizationUpdateSchema>;

/** Instance settings — a singleton: initialised once, then only updated. */
export class OrganizationService {
  constructor(private readonly repository: OrganizationRepository) {}

  get(): Organization | null {
    return this.repository.get() ?? null;
  }

  /** First-time initialisation — refused once the singleton exists. */
  init(input: OrganizationInit): Organization {
    if (this.repository.get()) {
      throw new CommunError(ERR.INVALID_STATE, 'la collectivité est déjà initialisée');
    }
    return this.repository.insert(input);
  }

  update(input: OrganizationUpdate): Organization {
    const updated = this.repository.update(input);
    if (!updated) throw new CommunError(ERR.NOT_FOUND, 'collectivité non initialisée');
    return updated;
  }
}
