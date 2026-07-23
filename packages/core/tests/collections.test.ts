import { beforeAll, afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connectDb, type StoreDb } from '../src/infrastructure/db/index.ts';
import { fieldDefinitionSchema } from '../src/domains/collections/fields.ts';
import {
  createDefinition,
  createEntry,
  getDefinition,
  listPublishedEntries,
  updateEntry,
} from '../src/domains/collections/queries.ts';
import { collectionDefinitionCreateSchema } from '../src/domains/collections/validation.ts';
import { CommunError } from '../src/common/errors/index.ts';

let dataDir: string;
let db: StoreDb;

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'commun-collections-test-'));
  db = connectDb(dataDir);
});

afterAll(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

const publicTenders = {
  name: 'Marchés publics',
  slug: 'public-tenders',
  fields: [
    { name: 'deadline', label: 'Date limite', type: 'date', required: true },
    { name: 'document', label: 'Document', type: 'media', required: false },
    { name: 'state', label: 'État', type: 'select', options: ['open', 'closed'] },
  ],
};

describe('collections engine', () => {
  test('rejects a field type outside the closed set', () => {
    const parsed = fieldDefinitionSchema.safeParse({ name: 'x', label: 'X', type: 'raw-html' });
    expect(parsed.success).toBe(false);
  });

  test('rejects a select field without options', () => {
    const parsed = fieldDefinitionSchema.safeParse({ name: 'state', label: 'État', type: 'select' });
    expect(parsed.success).toBe(false);
  });

  test('creates a definition and validates entries against the generated schema', () => {
    const input = collectionDefinitionCreateSchema.parse(publicTenders);
    const definition = createDefinition(db, input);
    expect(getDefinition(db, 'public-tenders').id).toBe(definition.id);

    const entry = createEntry(db, definition.id, {
      title: 'Réfection de la voirie',
      slug: 'refection-voirie',
      data: { deadline: '2026-09-01', state: 'open' },
    });
    expect(entry.status).toBe('draft');
    expect(entry.collectionId).toBe(definition.id);
  });

  test('rejects entry data violating the definition', () => {
    expect(() =>
      createEntry(db, 'public-tenders', {
        title: 'Entrée invalide',
        slug: 'entree-invalide',
        // deadline manquante + choix hors liste
        data: { state: 'cancelled' },
      }),
    ).toThrow(CommunError);
  });

  test('slugs are unique per collection with a domain-level error', () => {
    createEntry(db, 'events', { title: 'Marché', slug: 'marche', data: { start_date: '2026-08-01' } });
    expect(() =>
      createEntry(db, 'events', { title: 'Doublon', slug: 'marche', data: { start_date: '2026-08-02' } }),
    ).toThrow('déjà utilisé');
    // The same slug in ANOTHER collection is fine.
    createEntry(db, 'news', { title: 'Marché', slug: 'marche', data: {} });
  });

  test('entries work on a seeded default collection (news) with scheduling', () => {
    const draft = createEntry(db, 'news', {
      title: 'Brouillon',
      slug: 'brouillon',
      data: { excerpt: 'non publié' },
    });
    const published = createEntry(db, 'news', {
      title: 'Fête de la commune',
      slug: 'fete-de-la-commune',
      data: { excerpt: 'publiée' },
    });
    updateEntry(db, published.id, { status: 'published' });
    const scheduled = createEntry(db, 'news', {
      title: 'Programmée',
      slug: 'programmee',
      data: {},
    });
    updateEntry(db, scheduled.id, {
      status: 'published',
      publishedAt: new Date(Date.now() + 86_400_000).toISOString(),
    });

    const visible = listPublishedEntries(db, 'news');
    expect(visible.map((entry) => entry.slug)).toEqual(['fete-de-la-commune']);
    expect(visible.find((entry) => entry.id === draft.id)).toBeUndefined();
  });
});
