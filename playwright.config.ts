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
  // One shim, load-bearing: `nitro dev` cannot boot this API — core imports
  // `bun:sqlite`, and the nitro CLI + its dev worker run under Node, which
  // rejects the `bun:` scheme. So: build the API and run the production
  // bundle under Bun. The bundle resolves its migrations via
  // COMMUN_MIGRATIONS_DIR (same mechanism as the Docker image).
  // COMMUN_DATA_DIR points at a throwaway dir so E2E rows never land in the
  // developer's real ~/.commun data; it is recreated fresh each boot.
  webServer: [
    {
      command:
        'bun --filter @commun/api build && ' +
        'rm -rf "${TMPDIR:-/tmp}/commun-e2e-data" && ' +
        'COMMUN_DATA_DIR="${TMPDIR:-/tmp}/commun-e2e-data" ' +
        'COMMUN_MIGRATIONS_DIR="$PWD/packages/core/drizzle" ' +
        // S3 réel : MinIO démarré par le second webServer (media.feature
        // couvre l'aller-retour complet presign → PUT → finalize → lecture).
        'COMMUN_S3_BUCKET=commun-e2e COMMUN_S3_ACCESS_KEY=e2e-access COMMUN_S3_SECRET_KEY=e2e-secret-key ' +
        'COMMUN_S3_ENDPOINT=http://127.0.0.1:9102 COMMUN_S3_REGION=fr-par ' +
        // Webhook email : récepteur local démarré par les steps (security.feature)
        // — teste l'émission d'ÉVÉNEMENTS réelle, Bearer token compris.
        'COMMUN_EMAIL_WEBHOOK_URL=http://127.0.0.1:3199/emails ' +
        'COMMUN_EMAIL_WEBHOOK_TOKEN=e2e-webhook-token ' +
        'COMMUN_ADMIN_URL=https://admin.e2e.test ' +
        'COMMUN_JWT_SECRET=e2e-jwt-secret ' +
        // jobs.feature : mock APIDAE (e2e/mocks/apidae.mock.ts, démarré par
        // les steps) + route interne d'exécution des tasks (le endpoint tasks
        // de Nitro n'existe qu'en dev, la suite boote le bundle de prod).
        'COMMUN_APIDAE_API_URL=http://127.0.0.1:3198/apidae ' +
        'COMMUN_TASKS_HTTP=1 ' +
        'PORT=3101 bun apps/api/.output/server/index.mjs',
      url: 'http://127.0.0.1:3101/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // Portail (portal.feature) : nitro dev sur 3002, pointé sur l'API sous
      // test. Plus d'annuaire email → instance : le portail interroge les
      // instances qu'il connaît.
      command:
        'PORTAL_INSTANCES=\'{"e2e":"http://127.0.0.1:3101"}\' bun --filter @commun/portal dev',
      url: 'http://127.0.0.1:3002/',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // S3 réel pour media.feature (décision Quentin : monter un vrai S3 en
      // E2E). Le bucket est provisionné par le seed (`bucket`, idempotent).
      command:
        'docker rm -f commun-e2e-minio >/dev/null 2>&1; ' +
        'docker run --rm --name commun-e2e-minio -p 127.0.0.1:9102:9000 ' +
        '-e MINIO_ROOT_USER=e2e-access -e MINIO_ROOT_PASSWORD=e2e-secret-key ' +
        'minio/minio server /data',
      url: 'http://127.0.0.1:9102/minio/health/live',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
