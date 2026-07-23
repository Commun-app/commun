import { beforeAll, afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connectDb } from '../src/infrastructure/db/index.ts';
import { fieldDefinitionSchema } from '../src/domains/collections/schema.ts';
import { CollectionsRepository } from '../src/domains/collections/repository.ts';
import { CollectionsService } from '../src/domains/collections/service.ts';
import { MediaRepository } from '../src/domains/media/repository.ts';
import { MediaService } from '../src/domains/media/service.ts';
import { definitionCreateDto } from '../src/domains/collections/dtos/definition.dto.ts';
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
    const parsed = fieldDefinitionSchema.safeParse({
      name: 'state',
      label: 'État',
      type: 'select',
    });
    expect(parsed.success).toBe(false);
  });

  test('creates a definition and validates entries against the generated schema', async () => {
    const input = definitionCreateDto.parse(publicTenders);
    const definition = await collections.createDefinition(input);
    expect((await collections.getDefinition('public-tenders')).id).toBe(definition.id);

    const entry = await collections.createEntry(definition.id, {
      title: 'Réfection de la voirie',
      slug: 'refection-voirie',
      data: { deadline: '2026-09-01', state: 'open' },
    });
    expect(entry.status).toBe('draft');
    expect(entry.collectionId).toBe(definition.id);
  });

  test('rejects entry data violating the definition', async () => {
    await expect(
      collections.createEntry('public-tenders', {
        title: 'Entrée invalide',
        slug: 'entree-invalide',
        data: { state: 'cancelled' },
      }),
    ).rejects.toThrow(CommunError);
  });

  test('slug iso legacy : slugify(fr) auto + suffixe incrémental sur collision', async () => {
    // Sans slug fourni : généré depuis le titre, diacritiques strippés.
    const first = await collections.createEntry('events', {
      title: 'Marché de Noël',
      data: { start_date: '2026-08-01' },
    });
    expect(first.slug).toBe('marche-de-noel');
    // Collision → suffixe -1 (le legacy suffixait au lieu de rejeter).
    const second = await collections.createEntry('events', {
      title: 'Marché de Noël',
      data: { start_date: '2026-08-02' },
    });
    expect(second.slug).toBe('marche-de-noel-1');
    // Le même slug dans une AUTRE collection reste indépendant.
    const other = await collections.createEntry('news', { title: 'Marché de Noël', data: {} });
    expect(other.slug).toBe('marche-de-noel');
  });

  test('update partiel iso legacy : data fusionné champ par champ', async () => {
    const entry = await collections.createEntry('events', {
      title: 'Brocante',
      data: { start_date: '2026-09-01', location: 'Place du marché' },
    });
    const updated = await collections.updateEntry(entry.id, {
      data: { location: 'Salle des fêtes' },
    });
    expect(updated.data.location).toBe('Salle des fêtes');
    expect(updated.data.start_date).toBe('2026-09-01'); // conservé
  });

  test('publishedAt auto-posé au passage à published (iso legacy)', async () => {
    const entry = await collections.createEntry('news', { title: 'Datée', data: {} });
    expect(entry.publishedAt).toBeNull();
    const published = await collections.updateEntry(entry.id, { status: 'published' });
    expect(published.publishedAt).not.toBeNull();
  });

  test('scheduling: drafts and future publishedAt stay off the public plane', async () => {
    await collections.createEntry('news', { title: 'Brouillon', slug: 'brouillon', data: {} });
    const published = await collections.createEntry('news', {
      title: 'Publiée',
      slug: 'publiee',
      data: {},
    });
    await collections.updateEntry(published.id, { status: 'published' });
    const scheduled = await collections.createEntry('news', {
      title: 'Programmée',
      slug: 'programmee',
      data: {},
    });
    await collections.updateEntry(scheduled.id, {
      status: 'published',
      publishedAt: new Date(Date.now() + 86_400_000).toISOString(),
    });

    const slugs = (await collections.listPublishedEntries('news')).map((entry) => entry.slug);
    expect(slugs).toContain('publiee');
    expect(slugs).not.toContain('brouillon');
    expect(slugs).not.toContain('programmee');
  });

  test('payload legacy : médias en tableaux signés, wysiwyg stringifié avec mediaRecord', async () => {
    const { key } = await media.requestUpload('une.png', 'image/png');
    const uploaded = await media.finalize({ key, filename: 'une.png', mime: 'image/png' });

    const entry = await collections.createEntry('news', {
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
    await collections.updateEntry(entry.id, { status: 'published' });

    const records = await collections.legacyRecordsPayload();
    const record = records[entry.id]!;
    // Champ media : TABLEAU de records legacy signés (iso fetchMediaRecords).
    const cover = record.cover as Array<{
      _id: string;
      originalName: string;
      objects: Record<string, string>;
    }>;
    expect(cover).toHaveLength(1);
    expect(cover[0]!._id).toBe(uploaded.id);
    expect(cover[0]!.objects.original).toContain('fake-s3.local');
    expect(cover[0]!.objects['webp-840']).toContain('fake-s3.local');
    // Wysiwyg : STRING (iso legacy), avec mediaRecord + src signé dans les nœuds image.
    expect(typeof record.content).toBe('string');
    const doc = JSON.parse(record.content as string) as {
      content: Array<{ attrs?: { src?: string; mediaRecord?: { _id: string } } }>;
    };
    expect(doc.content[0]?.attrs?.src).toContain('fake-s3.local');
    expect(doc.content[0]?.attrs?.mediaRecord?._id).toBe(uploaded.id);
  });

  test('options.hidden : exclu du payload public (iso legacy)', async () => {
    const definition = await collections.createDefinition({
      name: 'Cachettes',
      fields: [
        { name: 'visible', label: 'Visible', type: 'text' },
        { name: 'secret', label: 'Secret', type: 'text', hidden: true },
      ],
    });
    const entry = await collections.createEntry(definition.id, {
      title: 'Entrée',
      data: { visible: 'oui', secret: 'non' },
      status: 'published',
    });
    const records = await collections.legacyRecordsPayload();
    expect(records[entry.id]!.visible).toBe('oui');
    expect(records[entry.id]!.secret).toBeUndefined();
  });
});
