import { test as base } from 'playwright-bdd';

/**
 * Per-scenario state carried between steps (e.g. the last HTTP response).
 * playwright-bdd builds its `Given/When/Then` on top of this extended `test`.
 */
export interface World {
  // health.feature
  status?: number;
  body?: unknown;
}

export const test = base.extend<{ world: World }>({
  world: async ({}, use) => {
    await use({});
  },
});
