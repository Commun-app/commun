#!/usr/bin/env bun
// E2E seeding helper — runs under BUN (core imports bun:sqlite, while the
// Playwright workers run under Node). Steps shell out to this script to seed
// state in the SAME database as the API under test, then talk HTTP only.
// Prints a JSON result on stdout.
import { join } from 'node:path';
// Relative import: e2e/ is not a workspace package, @commun/core is unresolvable here.
import {
  CollectionsRepository,
  createCore,
  OrganizationRepository,
  parseEnv,
  UsersRepository,
} from '../../packages/core/src/index.ts';
import { ADMIN_URL, E2E_DATA_DIR, EMAIL_WEBHOOK, JWT_SECRET, S3 } from '../constants.ts';
import { NEWS_DEFINITION, ORGANIZATION_INIT } from '../data/index.ts';
import { APIDAE_DEFINITIONS, APIDAE_INJECTOR } from '../data/apidae/index.ts';

// Chemin EXPLICITE uniquement (E2E_DATA_DIR, posé par e2e/steps/instance.ts) :
// Bun charge automatiquement le .env racine, donc COMMUN_DATA_DIR peut pointer
// vers une base de dev — le seed ne doit jamais écrire ailleurs que dans la
// base jetable de l'API sous test.
const dataDir = process.env.E2E_DATA_DIR ?? E2E_DATA_DIR;
const migrationsDir = join(import.meta.dir, '..', '..', 'packages', 'core', 'drizzle');
// S3 + webhook email REQUIS au boot (fail-fast) — mêmes valeurs que le
// webServer Playwright.
const core = createCore({
  env: parseEnv({
    COMMUN_DATA_DIR: dataDir,
    COMMUN_MIGRATIONS_DIR: migrationsDir,
    COMMUN_S3_ENDPOINT: S3.endpoint,
    COMMUN_S3_REGION: S3.region,
    COMMUN_S3_BUCKET: S3.bucket,
    COMMUN_S3_ACCESS_KEY: S3.accessKey,
    COMMUN_S3_SECRET_KEY: S3.secretKey,
    COMMUN_EMAIL_WEBHOOK_URL: EMAIL_WEBHOOK.seedDiscardUrl,
    COMMUN_EMAIL_WEBHOOK_TOKEN: EMAIL_WEBHOOK.token,
    COMMUN_ADMIN_URL: ADMIN_URL,
    COMMUN_JWT_SECRET: JWT_SECRET,
  }),
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
      await core.services.organization.init({ ...ORGANIZATION_INIT });
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
  case 'expire-invitation': {
    // Force l'expiration des invitations d'un email (suggestion Quentin :
    // upsert de l'expiration en base pour simuler le passage du temps).
    // SQLite direct : drizzle-orm n'est pas résoluble depuis e2e/ (linker isolé).
    const { Database } = await import('bun:sqlite');
    const sqlite = new Database(join(dataDir, 'commun.db'));
    sqlite.run("UPDATE invitations SET expires_at = '2000-01-01T00:00:00.000Z' WHERE email = ?", [
      argument!.toLowerCase(),
    ]);
    sqlite.close();
    console.log(JSON.stringify({ expired: argument }));
    break;
  }
  case 'bucket': {
    // Provisionne le bucket du MinIO E2E (idempotent) — mêmes valeurs que
    // playwright.config.ts. Le SDK S3 est résolu depuis packages/core qui le
    // possède (linker isolé Bun : introuvable depuis e2e/).
    const { createRequire } = await import('node:module');
    const requireFromCore = createRequire(
      new URL('../../packages/core/src/index.ts', import.meta.url).pathname,
    );
    const { S3Client, CreateBucketCommand } = requireFromCore('@aws-sdk/client-s3');
    const client = new S3Client({
      region: S3.region,
      endpoint: S3.endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId: S3.accessKey, secretAccessKey: S3.secretKey },
    });
    try {
      await client.send(new CreateBucketCommand({ Bucket: S3.bucket }));
    } catch (error) {
      const name = (error as { name?: string }).name ?? '';
      if (!name.includes('BucketAlready')) throw error;
    }
    console.log(JSON.stringify({ bucket: 'commun-e2e' }));
    break;
  }
  case 'news-entry': {
    const slug = argument!;
    const collections = core.services.collections;
    // Plus de collections seedées (revue 28/07) : la définition est créée ici.
    const hasNews = (await collections.listDefinitions()).some((d) => d.slug === 'news');
    if (!hasNews) {
      await collections.createDefinition(structuredClone(NEWS_DEFINITION) as never);
    }
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
  case 'account': {
    // Compte activé à email FIXE (portal.feature) — idempotent.
    // TEMPORAIRE (review PR #6) : le portail vit dans le monorepo le temps de
    // la migration silencieuse ; il sera remplacé par la vraie app portail
    // PRIVÉE de la section cloud (phase 6-7) et ce seed partira avec.
    const email = argument!.toLowerCase();
    const repository = new UsersRepository(core.db);
    try {
      await repository.activateUser({
        email,
        name: 'Compte Portail',
        passwordHash: Bun.password.hashSync('mot-de-passe-e2e'),
        role: 'admin',
      });
    } catch {
      // Déjà créé par un scénario précédent : rien à faire.
    }
    console.log(JSON.stringify({ email }));
    break;
  }
  case 'apidae': {
    // Instance ot-pertuis de jobs.feature, ISO PRODUCTION : injector dans
    // legacyExtra (iso migration — aucune surface service ne l'écrit), les
    // DEUX définitions migrées (lieux + agenda) avec leurs legacyId, et une
    // entrée publiée absente de la source (cible unlink) dans l'agenda.
    if (!(await core.services.organization.get())) {
      await core.services.organization.init({ ...ORGANIZATION_INIT });
    }
    await new OrganizationRepository(core.db).update({
      legacyExtra: { injector: structuredClone(APIDAE_INJECTOR) },
    });

    const collections = core.services.collections;
    const repository = new CollectionsRepository(core.db);
    const existingSlugs = new Set(
      (await collections.listDefinitions()).map((definition) => definition.slug),
    );
    for (const seedDefinition of APIDAE_DEFINITIONS) {
      if (existingSlugs.has(seedDefinition.slug)) continue;
      const definition = await repository.insertDefinition({
        name: seedDefinition.name,
        slug: seedDefinition.slug,
        fields: structuredClone(seedDefinition.fields) as never,
        legacyExtra: { legacyId: seedDefinition.legacyId },
      });
      if (seedDefinition.slug === 'agenda-apidae') {
        const stale = await collections.createEntry(definition.id, {
          title: 'Événement disparu de la source',
          data: { apidaeId: '424242' },
        });
        await collections.updateEntry(stale.id, { status: 'published' });
      }
    }
    console.log(JSON.stringify({ configured: true }));
    break;
  }
  default:
    console.error(`commande inconnue: ${command}`);
    process.exit(1);
}
