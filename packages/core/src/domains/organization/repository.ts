import { eq } from 'drizzle-orm';
import type { StoreDb } from '../../infrastructure/db/index.ts';
import { organization, type NewOrganization, type Organization } from './schema.ts';

/**
 * All database access of the organization domain (singleton row, id = 1).
 * Methods are async by contract even though bun:sqlite executes synchronously.
 */
export class OrganizationRepository {
  constructor(private readonly db: StoreDb) {}

  async get(): Promise<Organization | undefined> {
    return this.db.select().from(organization).where(eq(organization.id, 1)).get();
  }

  async insert(input: NewOrganization): Promise<Organization> {
    return this.db
      .insert(organization)
      .values({ ...input, id: 1 })
      .returning()
      .get();
  }

  async update(input: Partial<NewOrganization>): Promise<Organization | undefined> {
    return this.db.update(organization).set(input).where(eq(organization.id, 1)).returning().get();
  }
}
