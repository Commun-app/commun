import { test as base } from 'playwright-bdd';

/**
 * Per-scenario state carried between steps (e.g. the last HTTP response, the
 * session token, the API token). playwright-bdd builds its `Given/When/Then`
 * on top of this extended `test`.
 */
export interface World {
  status?: number;
  body?: unknown;
  // auth.feature / roles.feature
  inviteToken?: string;
  sessionToken?: string;
  // content features
  apiToken?: string;
  entryId?: string;
}

export const test = base.extend<{ world: World }>({
  world: async ({}, use) => {
    await use({});
  },
});
