import { beforeAll, afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import {
  collectionEntries,
  connectDb,
  CollectionsRepository,
  CollectionsService,
  MediaRepository,
  MediaService,
  OrganizationRepository,
  createLocalStorage,
  type StoreDb,
} from '@commun/core';

const servicesOf = (db: StoreDb, dir: string) => {
  const media = new MediaService(new MediaRepository(db), createLocalStorage(dir));
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
  test('organization singleton is populated with legacy metadata preserved', () => {
    const db = connectDb(outDir);
    const org = new OrganizationRepository(db).get();
    expect(org?.name).toBe('Ville de Grigny');
    expect((org?.legacyExtra as Record<string, unknown>).legacyId).toBe('64a000000000000000000001');
  });

  test('legacy news collection merges into the seeded default; entries keep status and scheduling', () => {
    const db = connectDb(outDir);
    const news = report.collections.find((collection) => collection.slug === 'news')!;
    expect(news.entries).toBe(2);
    // handler-schedules has no Commun equivalent → reported unmapped, value in legacy_extra.
    expect(news.fieldsUnmapped.join(' ')).toContain('widget3d');

    const published = servicesOf(db, outDir).listPublishedEntries('news');
    expect(published.map((entry) => entry.slug)).toEqual(['fete-de-la-ville']);
    const extra = published[0]?.legacyExtra as Record<string, unknown>;
    expect(extra.widget3d).toEqual({ periods: [] });
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
      .from(collectionEntries)
      .where(eq(collectionEntries.slug, 'marche-casse'))
      .get()!;
    const extra = broken.legacyExtra as Record<string, unknown>;
    expect(extra._invalidData).toBeDefined();
  });

  test('media manifest lists every object with its referencing entries', () => {
    expect(report.media.count).toBe(2);
    const cover = report.media.manifest.find((entry) => entry.legacyId === '64d000000000000000000001')!;
    expect(cover.referencedBy).toHaveLength(1);
  });

  test('re-running the migration is idempotent (fresh rebuild)', () => {
    const second = migrateOrganization({ dumpDir: FIXTURE, orgSlug: 'grigny', outDir });
    expect(second.collections.map((collection) => collection.entries)).toEqual(
      report.collections.map((collection) => collection.entries),
    );
    const db = connectDb(outDir);
    expect(servicesOf(db, outDir).listPublishedEntries('news')).toHaveLength(1);
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
