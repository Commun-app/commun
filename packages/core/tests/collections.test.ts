import { beforeAll, afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connectDb } from '../src/infrastructure/db/index.ts';
import { fieldDefinitionSchema } from '../src/domains/collections/fields.ts';
import { CollectionsRepository } from '../src/domains/collections/repository.ts';
import { CollectionsService } from '../src/domains/collections/service.ts';
import { MediaRepository } from '../src/domains/media/repository.ts';
import { MediaService } from '../src/domains/media/service.ts';
import { collectionDefinitionCreateSchema } from '../src/domains/collections/validation.ts';
import { CommunError } from '../src/common/errors/index.ts';
import { createFakeStorage } from './helpers/storage.ts';

let dataDir: string;
let collections: CollectionsService;
let media: MediaService;

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'commun-collections-test-'));
  const db = connectDb(dataDir);
  media = new MediaService(new MediaRepository(db), createFakeStorage());
  collections = new CollectionsService(new CollectionsRepository(db), media);
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

describe('CollectionsService', () => {
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
    const definition = collections.createDefinition(input);
    expect(collections.getDefinition('public-tenders').id).toBe(definition.id);

    const entry = collections.createEntry(definition.id, {
      title: 'Réfection de la voirie',
      slug: 'refection-voirie',
      data: { deadline: '2026-09-01', state: 'open' },
    });
    expect(entry.status).toBe('draft');
    expect(entry.collectionId).toBe(definition.id);
  });

  test('rejects entry data violating the definition', () => {
    expect(() =>
      collections.createEntry('public-tenders', {
        title: 'Entrée invalide',
        slug: 'entree-invalide',
        data: { state: 'cancelled' },
      }),
    ).toThrow(CommunError);
  });

  test('slugs are unique per collection with a domain-level error', () => {
    collections.createEntry('events', { title: 'Marché', slug: 'marche', data: { start_date: '2026-08-01' } });
    expect(() =>
      collections.createEntry('events', { title: 'Doublon', slug: 'marche', data: { start_date: '2026-08-02' } }),
    ).toThrow('déjà utilisé');
    // The same slug in ANOTHER collection is fine.
    collections.createEntry('news', { title: 'Marché', slug: 'marche', data: {} });
  });

  test('scheduling: drafts and future publishedAt stay off the public plane', () => {
    collections.createEntry('news', { title: 'Brouillon', slug: 'brouillon', data: {} });
    const published = collections.createEntry('news', { title: 'Publiée', slug: 'publiee', data: {} });
    collections.updateEntry(published.id, { status: 'published' });
    const scheduled = collections.createEntry('news', { title: 'Programmée', slug: 'programmee', data: {} });
    collections.updateEntry(scheduled.id, {
      status: 'published',
      publishedAt: new Date(Date.now() + 86_400_000).toISOString(),
    });

    const visible = collections.listPublishedEntries('news');
    expect(visible.map((entry) => entry.slug)).toEqual(['publiee']);
  });

  test('resolved public plane: media fields and rich-text image nodes get URLs', async () => {
    const { key } = await media.requestUpload('une.png', 'image/png');
    const uploaded = await media.finalize({ key, filename: 'une.png', mime: 'image/png' });

    const entry = collections.createEntry('news', {
      title: 'Avec image',
      slug: 'avec-image',
      data: {
        cover: uploaded.id,
        content: {
          type: 'doc',
          content: [{ type: 'image', attrs: { id: uploaded.id } }, { type: 'paragraph' }],
        },
      },
    });
    collections.updateEntry(entry.id, { status: 'published' });

    const [resolved] = await collections.listPublishedEntriesResolved('news');
    const cover = resolved!.data.cover as { id: string; url: string };
    expect(cover.id).toBe(uploaded.id);
    expect(cover.url).toContain('fake-s3.local');
    const doc = resolved!.data.content as { content: Array<{ attrs?: { src?: string } }> };
    expect(doc.content[0]?.attrs?.src).toContain('fake-s3.local');
  });
});
