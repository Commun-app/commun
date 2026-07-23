import { eq } from 'drizzle-orm';
import type { StoreDb } from '../../infrastructure/db/index.ts';
import { organization, type NewOrganization, type Organization } from './schema.ts';

/** All database access of the organization domain (singleton row, id = 1). */
export class OrganizationRepository {
  constructor(private readonly db: StoreDb) {}

  get(): Organization | undefined {
    return this.db.select().from(organization).where(eq(organization.id, 1)).get();
  }

  insert(input: NewOrganization): Organization {
    return this.db
      .insert(organization)
      .values({ ...input, id: 1 })
      .returning()
      .get();
  }

  update(input: Partial<NewOrganization>): Organization | undefined {
    return this.db.update(organization).set(input).where(eq(organization.id, 1)).returning().get();
  }
}
