import { beforeAll, afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connectDb, type StoreDb } from '../src/infrastructure/db/index.ts';
import { organization } from '../src/domains/organization/schema.ts';
import { collectionEntries } from '../src/domains/collections/schema.ts';
import { CollectionsRepository } from '../src/domains/collections/repository.ts';
import { CollectionsService } from '../src/domains/collections/service.ts';
import { MediaRepository } from '../src/domains/media/repository.ts';
import { MediaService } from '../src/domains/media/service.ts';
import { createFakeStorage } from './helpers/storage.ts';

let dataDir: string;
let db: StoreDb;
let collections: CollectionsService;

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'commun-schema-test-'));
  db = connectDb(dataDir);
  const media = new MediaService(new MediaRepository(db), createFakeStorage());
  collections = new CollectionsService(new CollectionsRepository(db), media);
});

afterAll(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

describe('schema — core domains', () => {
  test('organization is a configurable singleton row', () => {
    db.insert(organization).values({ name: 'Grigny', slug: 'grigny', type: 'commune' }).run();
    const rows = db.select().from(organization).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(1);
    expect(rows[0]?.name).toBe('Grigny');
  });

  test('the seed migration created the four default collections', () => {
    const slugs = collections
      .listDefinitions()
      .map((definition) => definition.slug)
      .sort();
    expect(slugs).toEqual(['events', 'news', 'officials', 'projects']);
  });

  test('entries cascade-delete with their collection definition', () => {
    const definition = collections.getDefinition('projects');
    collections.createEntry(definition.id, {
      title: 'Place du marché',
      slug: 'place-du-marche',
      data: {},
    });
    expect(db.select().from(collectionEntries).all()).toHaveLength(1);

    collections.removeDefinition(definition.id);
    expect(db.select().from(collectionEntries).all()).toHaveLength(0);
  });
});
