import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

// playwright-bdd generates Playwright test files from the Gherkin features +
// step definitions. `bun run test:e2e` runs `bddgen` (generation) then
// `playwright test`. The generated files land in `.features-gen/` (gitignored).
const testDir = defineBddConfig({
  features: 'e2e/features/**/*.feature',
  steps: 'e2e/steps/**/*.ts',
});

export default defineConfig({
  testDir,
  reporter: 'list',
  timeout: 30_000,
  use: {
    // The API under test runs on a DEDICATED test port (not the dev 3001) so
    // the suite never collides with a dev instance. The `request` fixture and
    // the tRPC client (e2e/steps/trpc.ts) both target it.
    baseURL: 'http://127.0.0.1:3101',
  },
  // Boot the API under test on the dedicated test port.
  //
  // Two shims, both load-bearing:
  // 1. `nitro dev` cannot boot this API: core imports `bun:sqlite`, and the
  //    nitro CLI + its dev worker run under Node, which rejects the `bun:`
  //    scheme. So: build the API and run the production bundle under Bun.
  // 2. In the built bundle, core's MIGRATIONS_FOLDER (`import.meta.dir` +
  //    `../../../drizzle`) resolves to `apps/api/drizzle` — symlink it to
  //    `packages/core/drizzle` before starting.
  // COMMUN_DATA_DIR points at a throwaway dir so E2E rows never land in the
  // developer's real ~/.commun data; it is recreated fresh each boot.
  webServer: [
    {
      command:
        'bun --filter @commun/api build && ' +
        'ln -sfn ../../packages/core/drizzle apps/api/drizzle && ' +
        'rm -rf "${TMPDIR:-/tmp}/commun-e2e-data" && ' +
        'COMMUN_DATA_DIR="${TMPDIR:-/tmp}/commun-e2e-data" ' +
        'PORT=3101 bun apps/api/.output/server/index.mjs',
      url: 'http://127.0.0.1:3101/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
