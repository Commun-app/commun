import { test as base } from 'playwright-bdd';

/**
 * Per-scenario state carried between steps (e.g. the last HTTP response, the
 * session token, the API token). playwright-bdd builds its `Given/When/Then`
 * on top of this extended `test`.
 */
export interface World {
  status?: number;
  body?: unknown;
  // security.feature / users.feature
  inviteToken?: string;
  sessionToken?: string;
  secondSessionToken?: string;
  accountEmail?: string;
  resetUrl?: string;
  memberId?: string;
  // media.feature
  mediaId?: string;
  // cms.feature / deployment.feature
  apiToken?: string;
  createdApiTokenId?: string;
  createdApiToken?: string;
  collectionId?: string;
  entryId?: string;
  entryIds?: string[];
  // jobs.feature
  taskResult?: unknown;
  hookHitsBefore?: number;
  // security.feature (CORS)
  corsOrigin?: string;
  corsHeaders?: { allowOrigin: string | null; allowCredentials: string | null };
}

export const test = base.extend<{ world: World }>({
  world: async ({}, use) => {
    await use({});
  },
});
