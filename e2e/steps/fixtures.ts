import { test as base } from 'playwright-bdd';

/**
 * Per-scenario state carried between steps (e.g. the last HTTP response, the
 * session cookie, the API token). playwright-bdd builds its `Given/When/Then`
 * on top of this extended `test`.
 */
export interface World {
  status?: number;
  body?: unknown;
  // auth.feature
  inviteToken?: string;
  cookie?: string;
  // content.feature
  apiToken?: string;
}

export const test = base.extend<{ world: World }>({
  world: async ({}, use) => {
    await use({});
  },
});
