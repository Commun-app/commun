#!/usr/bin/env bun
// E2E seeding helper — runs under BUN (core imports bun:sqlite, while the
// Playwright workers run under Node). Steps shell out to this script to seed
// state in the SAME database as the API under test, then talk HTTP only.
// Prints a JSON result on stdout.
import { join } from 'node:path';
import { tmpdir } from 'node:os';
// Relative import: e2e/ is not a workspace package, @commun/core is unresolvable here.
import { createCore, parseEnv } from '../../packages/core/src/index.ts';

const dataDir = process.env.COMMUN_DATA_DIR ?? join(tmpdir(), 'commun-e2e-data');
const migrationsDir = join(import.meta.dir, '..', '..', 'packages', 'core', 'drizzle');
const core = createCore({
  env: parseEnv({ COMMUN_DATA_DIR: dataDir, COMMUN_MIGRATIONS_DIR: migrationsDir }),
});

const [command, argument] = process.argv.slice(2);

switch (command) {
  case 'invitation': {
    const { token } = core.services.users.createInvitation({ email: argument!, role: 'admin' });
    console.log(JSON.stringify({ token }));
    break;
  }
  case 'api-token': {
    const { token } = core.services.users.createApiToken(`e2e-${argument ?? 'token'}`);
    console.log(JSON.stringify({ token }));
    break;
  }
  case 'news-entry': {
    const slug = argument!;
    const collections = core.services.collections;
    const existing = collections.listEntries('news').find((entry) => entry.slug === slug);
    if (!existing) {
      const published = collections.createEntry('news', { title: 'Fête du village', slug, data: {} });
      collections.updateEntry(published.id, { status: 'published' });
      collections.createEntry('news', { title: 'Brouillon e2e', slug: `${slug}-draft`, data: {} });
    }
    console.log(JSON.stringify({ slug }));
    break;
  }
  default:
    console.error(`commande inconnue: ${command}`);
    process.exit(1);
}
