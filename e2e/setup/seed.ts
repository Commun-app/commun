#!/usr/bin/env bun
// E2E seeding helper — runs under BUN (core imports bun:sqlite, while the
// Playwright workers run under Node). Steps shell out to this script to seed
// state in the SAME database as the API under test, then talk HTTP only.
// Prints a JSON result on stdout.
import { join } from 'node:path';
import { tmpdir } from 'node:os';
// Relative import: e2e/ is not a workspace package, @commun/core is unresolvable here.
import { createCore, parseEnv, UsersRepository } from '../../packages/core/src/index.ts';

// Chemin EXPLICITE uniquement (E2E_DATA_DIR, posé par e2e/steps/instance.ts) :
// Bun charge automatiquement le .env racine, donc COMMUN_DATA_DIR peut pointer
// vers une base de dev — le seed ne doit jamais écrire ailleurs que dans la
// base jetable de l'API sous test.
const dataDir = process.env.E2E_DATA_DIR ?? join(tmpdir(), 'commun-e2e-data');
const migrationsDir = join(import.meta.dir, '..', '..', 'packages', 'core', 'drizzle');
const core = createCore({
  env: parseEnv({ COMMUN_DATA_DIR: dataDir, COMMUN_MIGRATIONS_DIR: migrationsDir }),
});

const [command, argument] = process.argv.slice(2);

switch (command) {
  case 'invitation': {
    const { token } = await core.services.users.createInvitation({
      email: argument!,
      role: 'admin',
    });
    console.log(JSON.stringify({ token }));
    break;
  }
  case 'api-token': {
    const { token } = await core.services.users.createApiToken(`e2e-${argument ?? 'token'}`);
    console.log(JSON.stringify({ token }));
    break;
  }
  case 'organization': {
    if (!(await core.services.organization.get())) {
      await core.services.organization.init({
        name: 'Commune E2E',
        slug: 'commune-e2e',
        type: 'commune',
      });
    }
    console.log(JSON.stringify({ initialized: true }));
    break;
  }
  case 'session': {
    // Logged-in session for a fresh user with the given role (admin|redacteur).
    const role = (argument === 'redacteur' ? 'redacteur' : 'admin') as 'admin' | 'redacteur';
    const repository = new UsersRepository(core.db);
    const user = await repository.activateUser({
      email: `e2e-${role}-${Math.random().toString(36).slice(2, 8)}@e2e.fr`,
      name: `E2E ${role}`,
      passwordHash: Bun.password.hashSync('mot-de-passe-e2e'),
      role,
    });
    const { token } = await core.services.users.createSession(user);
    console.log(JSON.stringify({ token }));
    break;
  }
  case 'news-entry': {
    const slug = argument!;
    const collections = core.services.collections;
    const existing = (await collections.listEntries('news')).find((entry) => entry.slug === slug);
    if (!existing) {
      const published = await collections.createEntry('news', {
        title: 'Fête du village',
        slug,
        data: {},
      });
      await collections.updateEntry(published.id, { status: 'published' });
      await collections.createEntry('news', {
        title: 'Brouillon e2e',
        slug: `${slug}-draft`,
        data: {},
      });
    }
    console.log(JSON.stringify({ slug }));
    break;
  }
  default:
    console.error(`commande inconnue: ${command}`);
    process.exit(1);
}
