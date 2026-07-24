import { beforeAll, afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import {
  collectionDefinitions,
  entries as entriesTable,
  users as usersTable,
  connectDb,
  CollectionsRepository,
  CollectionsService,
  MediaRepository,
  MediaService,
  OrganizationRepository,
  type StorageDriver,
  type StoreDb,
} from '@commun/core';

const fakeStorage: StorageDriver = {
  kind: 's3',
  presignedPutUrl: async (key) => `https://fake/${key}`,
  head: async () => ({ size: 0 }),
  remove: async () => {},
  url: async (key) => `https://fake/${key}`,
};
const servicesOf = (db: StoreDb, _dir: string) => {
  const media = new MediaService(new MediaRepository(db), fakeStorage);
  return new CollectionsService(new CollectionsRepository(db), media);
};
import { migrateOrganization, type MigrationReport } from '../src/migrate.ts';

const FIXTURE = join(import.meta.dir, '..', 'fixtures', 'sample');

let outDir: string;
let report: MigrationReport;

beforeAll(() => {
  outDir = mkdtempSync(join(tmpdir(), 'commun-migrate-test-'));
  report = migrateOrganization({ dumpDir: FIXTURE, orgSlug: 'grigny', outDir });
});

afterAll(() => {
  rmSync(outDir, { recursive: true, force: true });
});

describe('legacy migration (sample dump)', () => {
  test('organization singleton is populated with legacy metadata preserved', async () => {
    const db = connectDb(outDir);
    const org = await new OrganizationRepository(db).get();
    expect(org?.name).toBe('Ville de Grigny');
    expect((org?.legacyExtra as Record<string, unknown> | undefined)?.legacyId).toBe(
      '64a000000000000000000001',
    );
  });

  test('legacy news collection merges into the seeded default; entries keep status and scheduling', async () => {
    const db = connectDb(outDir);
    const news = report.collections.find((collection) => collection.slug === 'news')!;
    expect(news.entries).toBe(2);
    // handler-schedules has no Commun equivalent → reported unmapped, value in legacy_extra.
    expect(news.fieldsUnmapped.join(' ')).toContain('widget3d');

    const published = await servicesOf(db, outDir).listPublishedEntries('news');
    expect(published.map((entry) => entry.slug)).toEqual(['fete-de-la-ville']);
    const extra = published[0]?.legacyExtra as Record<string, unknown>;
    expect(extra.widget3d).toEqual({ periods: [] });

    // La définition legacy REMPLACE le seed : nom et éditeur legacy conservés.
    const definition = db
      .select()
      .from(collectionDefinitions)
      .all()
      .find((row) => row.slug === 'news')!;
    expect(definition.name).toBe('Actualités');
    expect(definition.editor).not.toBeNull();
  });

  test('seeds produit non réclamés par le legacy : supprimés (pas de doublons vides)', () => {
    const db = connectDb(outDir);
    const slugs = db
      .select()
      .from(collectionDefinitions)
      .all()
      .map((row) => row.slug)
      .sort();
    // news réutilisé par le legacy ; events/officials/projects (seeds) purgés.
    expect(slugs).toEqual(['news', 'tenders']);
  });

  test('custom legacy collection becomes a new definition with typed fields', () => {
    const tenders = report.collections.find((collection) => collection.slug === 'tenders')!;
    expect(tenders.fieldsMapped).toBe(3); // deadline, state, linked_news
    expect(tenders.entries).toBe(2);
    // "annulé" is outside the select options → entry kept, data quarantined.
    expect(tenders.entriesInvalid).toBe(1);
  });

  test('invalid entries are preserved, not dropped', () => {
    const db = connectDb(outDir);
    const broken = db
      .select()
      .from(entriesTable)
      .where(eq(entriesTable.slug, 'marche-casse'))
      .get()!;
    const extra = broken.legacyExtra as Record<string, unknown>;
    expect(extra._invalidData).toBeDefined();
  });

  test('media manifest lists every object with its referencing entries', () => {
    expect(report.media.count).toBe(2);
    const cover = report.media.manifest.find(
      (entry) => entry.legacyId === '64d000000000000000000001',
    )!;
    expect(cover.referencedBy).toHaveLength(1);
  });

  test('users : membres de l\'org + racines plateforme, rôles mappés, hash conservé', () => {
    expect(report.users).toBe(2);
    const db = connectDb(outDir);
    const all = db.select().from(usersTable).all();
    // Racine plateforme (manage:all, pas membre de grigny) → admin.
    expect(all.find((u) => u.email === 'root@poulp.us')?.role).toBe('admin');
    // Membre grigny « Editeur de contenu » → redacteur, email normalisé minuscules.
    const redac = all.find((u) => u.email === 'redac@grigny91.fr')!;
    expect(redac.role).toBe('redacteur');
    expect(redac.name).toBe('Rédac Grigny');
    // Hash bcrypt legacy conservé tel quel (vérifiable par Bun.password).
    expect(redac.passwordHash?.startsWith('$2a$13$')).toBe(true);
    // Membre d'une AUTRE org et compte sans mot de passe : exclus.
    expect(all.some((u) => u.email === 'autre@ailleurs.fr')).toBe(false);
    expect(all.some((u) => u.email === 'sans-mdp@grigny91.fr')).toBe(false);
  });

  test('re-running the migration is idempotent (fresh rebuild)', async () => {
    const second = migrateOrganization({ dumpDir: FIXTURE, orgSlug: 'grigny', outDir });
    expect(second.collections.map((collection) => collection.entries)).toEqual(
      report.collections.map((collection) => collection.entries),
    );
    const db = connectDb(outDir);
    expect(await servicesOf(db, outDir).listPublishedEntries('news')).toHaveLength(1);
  });

  test('unknown organization produces an explicit error', () => {
    const other = mkdtempSync(join(tmpdir(), 'commun-migrate-err-'));
    try {
      const failed = migrateOrganization({ dumpDir: FIXTURE, orgSlug: 'nowhere', outDir: other });
      expect(failed.errors[0]).toContain('nowhere');
    } finally {
      rmSync(other, { recursive: true, force: true });
    }
  });
});
