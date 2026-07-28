import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DateTime } from 'luxon';
import {
  ApidaeClient,
  CollectionsRepository,
  CollectionsService,
  connectDb,
  MediaRepository,
  MediaService,
  ObjectMapper,
  OrganizationRepository,
  OrganizationService,
  runApidaeSync,
  transformWysiwyg,
  type ApidaeSyncDeps,
  type FieldDefinition,
  type StorageDriver,
  type StoreDb,
} from '../../src/index.ts';
import { OBJET_EXPIRE, OBJET_FESTIVAL, OBJET_MARCHE, OT_PERTUIS_MAPPING } from './fixtures.ts';

// Suite hors ligne (spec apidae-sync « Tests sur fixtures APIDAE ») : tous les
// échanges réseau — API APIDAE, téléchargements de médias, hook Vercel — sont
// servis par des stubs fetch locaux.

const NOW = DateTime.fromISO('2026-07-28T12:00:00', { zone: 'Europe/Paris' });
const LEGACY_COLLECTION_ID = '6477737e1548ddf04ff95042';

const FIELDS: FieldDefinition[] = [
  { name: 'apidaeId', label: 'apidaeId', type: 'text', required: false, hidden: true },
  { name: 'description', label: 'Description', type: 'text', required: false, hidden: false },
  { name: 'content', label: 'Contenu', type: 'rich-text', required: false, hidden: false },
  { name: 'location', label: 'Localisation', type: 'json', required: false, hidden: false },
  { name: 'email', label: 'Email', type: 'text', required: false, hidden: false },
  { name: 'phone', label: 'Téléphone', type: 'text', required: false, hidden: false },
  { name: 'services', label: 'Services', type: 'json', required: false, hidden: false },
  { name: 'schedules', label: 'Horaires', type: 'json', required: false, hidden: false },
  { name: 'cover', label: 'Couverture', type: 'media', required: false, hidden: false },
];

const schedulesHandlers = {
  '@apidaeSchedules': (value: unknown) =>
    ApidaeClient.transformSchedules(value as Record<string, unknown>, NOW),
  '@apidaeMedia': (value: unknown) => ApidaeClient.transformMedia((value as never) ?? []),
  '@poulpusWYSIWYG': (value: unknown) => transformWysiwyg(value),
};

// ── Transforms unitaires ─────────────────────────────────────────────────────

describe('transformSchedules', () => {
  test('OUVERTURE_TOUS_LES_JOURS avec horaires → DAILY, dates ISO Europe/Paris', () => {
    const { summary, periods } = ApidaeClient.transformSchedules(OBJET_FESTIVAL.ouverture, NOW);
    expect(summary).toBe('Tous les jours du 1er juillet au 31 août');
    expect(periods).toHaveLength(1);
    expect(periods[0]?.periodicity).toBe('DAILY');
    expect(periods[0]?.fromDate).toBe('2026-07-01T10:00:00.000+02:00');
    expect(periods[0]?.toDate).toBe('2026-08-31T19:00:00.000+02:00');
  });

  test('OUVERTURE_MOIS → MONTHLY avec periodRank corrigé (FIRST, pas "FIRST1")', () => {
    const { periods } = ApidaeClient.transformSchedules(OBJET_MARCHE.ouverture, NOW);
    expect(periods[0]?.periodicity).toBe('MONTHLY');
    // Premier mardi du mois : day 2 (ISO), rang FIRST — le legacy produisait "FIRST1".
    expect(periods[0]?.weekDays).toEqual([{ periodRank: 'FIRST', day: 2 }]);
  });

  test('OUVERTURE_SEMAINE partielle → WEEKLY avec jours ISO', () => {
    const { periods } = ApidaeClient.transformSchedules(
      {
        periodesOuvertures: [
          {
            dateDebut: '2026-06-01',
            dateFin: '2026-09-30',
            type: 'OUVERTURE_SEMAINE',
            ouverturesJournalieres: [{ jour: 'LUNDI' }, { jour: 'SAMEDI' }],
          },
        ],
      },
      NOW,
    );
    expect(periods[0]?.periodicity).toBe('WEEKLY');
    expect(periods[0]?.weekDays).toEqual([{ day: 1 }, { day: 6 }]);
  });

  test('événement fini depuis plus d’un mois → E_EVENT_EXPIRED', () => {
    expect(() => ApidaeClient.transformSchedules(OBJET_EXPIRE.ouverture, NOW)).toThrow(
      'E_EVENT_EXPIRED',
    );
  });
});

describe('transformMedia', () => {
  test('traduction fr extraite, illustration sans fr ignorée (le legacy plantait)', () => {
    const media = ApidaeClient.transformMedia(OBJET_FESTIVAL.illustrations);
    expect(media).toHaveLength(1);
    expect(media[0]).toEqual({
      originalName: 'festival.jpg',
      originalUrl: 'https://media.apidae.example/111.jpg',
      mime: 'image/jpeg',
      metaData: { apidaeId: '111', logo: false, header: true },
    });
  });
});

describe('transformWysiwyg', () => {
  test('sortie identique au doc TipTap legacy (non-régression stringifiée)', () => {
    expect(JSON.stringify(transformWysiwyg('Bonjour'))).toBe(
      '{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"Bonjour"}]}]}',
    );
  });
});

// ── Mapper iso-legacy ────────────────────────────────────────────────────────

describe('ObjectMapper (mapping ot-pertuis reproduit)', () => {
  const mapper = new ObjectMapper(OT_PERTUIS_MAPPING, schedulesHandlers);
  const mapped = mapper.mapObject(OBJET_FESTIVAL);

  test('champs simples et chemins pointés', () => {
    expect(mapped.apidaeId).toBe(5211547);
    expect(mapped.title).toBe('Festival des Lavandes');
    expect(mapped.description).toBe('Un festival en plein air.');
  });

  test('$concat d’adresse — adresse2 vide perdue (falsy, iso legacy)', () => {
    expect(mapped.location.address).toBe('Place du Marché, 84120, Pertuis');
    expect(mapped.location.coordinates).toEqual([5.5029, 43.6949]);
  });

  test('$arrayFilters sur les moyens de communication ($eq strict)', () => {
    expect(mapped.email).toBe('contact@festival.example');
    expect(mapped.phone).toBe('04 90 00 00 00');
  });

  test('$mapping projette les seuls id/libelleFr', () => {
    expect(mapped.services).toEqual([
      { id: 1234, libelleFr: 'Parking' },
      { id: 999, libelleFr: 'Accès PMR' },
    ]);
  });

  test('échappement iso legacy : seule la PREMIÈRE occurrence de \\n', () => {
    expect(mapped.content).toBe('Long texte\\nsur deux lignes\nvoire trois');
  });

  test('transform inconnu → E_UNKNOWN_TRANSFORMATION', () => {
    const broken = new ObjectMapper(
      { foo: { source: 'id', transform: { '@airtableSchedules': true } } },
      schedulesHandlers,
    );
    expect(() => broken.mapObject(OBJET_FESTIVAL)).toThrow('E_UNKNOWN_TRANSFORMATION');
  });
});

// ── Sync de bout en bout sur fixtures ────────────────────────────────────────

describe('runApidaeSync', () => {
  let dataDir: string;
  let db: StoreDb;
  let deps: ApidaeSyncDeps;
  let collectionsRepository: CollectionsRepository;
  let mediaRepository: MediaRepository;
  let collections: CollectionsService;
  let definitionId: string;
  const putKeys: string[] = [];
  const apidaeCalls: number[] = [];

  const fakeStorage: StorageDriver = {
    presignedPutUrl: async (key) => `https://fake/${key}`,
    put: async (key) => {
      putKeys.push(key);
    },
    head: async () => ({ size: 3 }),
    remove: async () => {},
    url: async (key) => `https://signed/${key}`,
  };

  const fetchStub: typeof fetch = (async (input: unknown) => {
    const url = String(input);
    if (url.includes('list-objets-touristiques')) {
      const query = JSON.parse(decodeURIComponent(url.split('?query=')[1] as string));
      apidaeCalls.push(query.first);
      const objets = query.first === 0 ? [OBJET_FESTIVAL, OBJET_MARCHE, OBJET_EXPIRE] : [];
      return new Response(JSON.stringify({ objetsTouristiques: objets }));
    }
    if (url.startsWith('https://media.apidae.example/')) {
      return new Response(new Uint8Array([1, 2, 3]));
    }
    throw new Error(`URL inattendue en test: ${url}`);
  }) as typeof fetch;

  beforeAll(async () => {
    dataDir = mkdtempSync(join(tmpdir(), 'commun-sync-test-'));
    db = connectDb(dataDir, join(import.meta.dir, '..', '..', 'drizzle'));

    mediaRepository = new MediaRepository(db);
    const media = new MediaService(mediaRepository, fakeStorage);
    collectionsRepository = new CollectionsRepository(db);
    collections = new CollectionsService(collectionsRepository, media);
    const organizationRepository = new OrganizationRepository(db);
    const organization = new OrganizationService(organizationRepository);
    deps = { organization, collections, collectionsRepository, media, mediaRepository };

    const definition = await collectionsRepository.insertDefinition({
      name: 'Agenda',
      slug: 'events',
      fields: FIELDS,
      legacyExtra: { legacyId: LEGACY_COLLECTION_ID },
    });
    definitionId = definition.id;

    await organizationRepository.insert({
      name: 'Office de tourisme de Pertuis',
      slug: 'ot-pertuis',
      legacyExtra: {
        injector: {
          enable: true,
          pipelines: [
            {
              sort: 'apidae',
              unlink: true,
              credentials: { projectId: 'projet-test', apiKey: 'cle-test' },
              collection: LEGACY_COLLECTION_ID,
              mapping: OT_PERTUIS_MAPPING,
              selectionIds: [148923],
            },
            { sort: 'airtable', unlink: false },
          ],
        },
      },
    });

    // Entrée publiée absente de la source : doit être dépubliée par l'unlink.
    await collections.createEntry(definitionId, {
      title: 'Événement disparu',
      data: { apidaeId: '424242' },
      status: 'published',
    });
  });

  afterAll(() => {
    rmSync(dataDir, { recursive: true, force: true });
  });

  test('passe nominale : créations publiées, expiré rejeté, airtable ignoré', async () => {
    const report = await runApidaeSync(deps, { fetchImpl: fetchStub, now: NOW });

    expect(report.status).toBe('ok');
    expect(report.ignored).toBe(1); // pipeline airtable
    expect(report.pipelines).toHaveLength(1);
    const pipeline = report.pipelines[0]!;
    expect(pipeline.collection).toBe('events');
    expect(pipeline.total).toBe(3);
    expect(pipeline.created).toBe(2);
    expect(pipeline.expired).toBe(1);
    expect(pipeline.errors).toEqual([]);
    expect(pipeline.collectFailed).toBe(false);
    // Pagination : page pleine puis page vide.
    expect(apidaeCalls).toEqual([0, 20]);
  });

  test('les entrées créées sont publiées et normalisées par type de champ', async () => {
    const entries = await collections.listEntries(definitionId);
    const festival = entries.find((entry) => entry.data.apidaeId === '5211547');
    expect(festival).toBeDefined();
    expect(festival?.status).toBe('published');
    expect(festival?.title).toBe('Festival des Lavandes');
    // rich-text : chaîne brute → enveloppe legacyHtml (iso CLI de migration).
    expect(festival?.data.content).toEqual({
      type: 'doc',
      legacyHtml: 'Long texte\\nsur deux lignes\nvoire trois',
    });
    // enums : valeur réduite aux ids (iso legacy).
    expect(festival?.data.services).toEqual([1234, 999]);
    // schedules sérialisées en ISO.
    const schedules = festival?.data.schedules as { periods: unknown[] } | undefined;
    expect(schedules?.periods).toHaveLength(1);
  });

  test('les items d’enum manquants rejoignent le legacyExtra de la définition', async () => {
    const definition = await collectionsRepository.findDefinitionById(definitionId);
    const enumItems = (definition?.legacyExtra as { enumItems?: Record<string, unknown[]> })
      ?.enumItems;
    expect(enumItems?.services).toEqual([
      { id: 1234, label: 'Parking' },
      { id: 999, label: 'Accès PMR' },
    ]);
  });

  test('médias : upload via le driver, metaData en clés simples, fr manquante ignorée', async () => {
    const rows = await mediaRepository.list();
    expect(rows).toHaveLength(1); // l'illustration en-only est ignorée
    expect(rows[0]?.metaData).toEqual({ apidaeId: '111', logo: false, header: true });
    expect(putKeys).toHaveLength(1);
    const entries = await collections.listEntries(definitionId);
    const festival = entries.find((entry) => entry.data.apidaeId === '5211547');
    expect(festival?.data.cover).toEqual([rows[0]?.id]);
  });

  test('unlink en fin de passe : le disparu passe en draft, les créations restent publiées', async () => {
    const entries = await collections.listEntries(definitionId);
    const gone = entries.find((entry) => entry.data.apidaeId === '424242');
    expect(gone?.status).toBe('draft');
    const kept = entries.filter((entry) => entry.status === 'published');
    expect(kept).toHaveLength(2);
  });

  test('seconde passe idempotente : mises à jour, aucun doublon, média réutilisé', async () => {
    const report = await runApidaeSync(deps, { fetchImpl: fetchStub, now: NOW });
    const pipeline = report.pipelines[0]!;
    expect(pipeline.created).toBe(0);
    expect(pipeline.updated).toBe(2);
    expect(pipeline.mediaUploaded).toBe(0);
    expect(pipeline.mediaReused).toBe(1);
    const entries = await collections.listEntries(definitionId);
    expect(entries.filter((entry) => entry.data.apidaeId === '5211547')).toHaveLength(1);
    expect(await mediaRepository.list()).toHaveLength(1);
  });

  test('collecte en échec : erreur rapportée et unlink annulé', async () => {
    const failingFetch: typeof fetch = (async () => {
      throw new Error('ECONNREFUSED');
    }) as typeof fetch;
    const report = await runApidaeSync(deps, { fetchImpl: failingFetch, now: NOW });
    const pipeline = report.pipelines[0]!;
    expect(pipeline.collectFailed).toBe(true);
    expect(pipeline.unlinkSkipped).toBe(true);
    expect(pipeline.errors[0]).toContain('collecte interrompue');
    // Rien n'a été dépublié malgré la source « vide ».
    const entries = await collections.listEntries(definitionId);
    expect(entries.filter((entry) => entry.status === 'published')).toHaveLength(2);
  });

  test('injector absent ou désactivé → rien à synchroniser', async () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'commun-sync-empty-'));
    try {
      const emptyDb = connectDb(emptyDir, join(import.meta.dir, '..', '..', 'drizzle'));
      const organization = new OrganizationService(new OrganizationRepository(emptyDb));
      const report = await runApidaeSync(
        { ...deps, organization },
        { fetchImpl: fetchStub, now: NOW },
      );
      expect(report.status).toBe('nothing-to-sync');
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});

// ── Deploy ───────────────────────────────────────────────────────────────────

describe('OrganizationService.deploy', () => {
  let dataDir: string;
  let repository: OrganizationRepository;

  beforeAll(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'commun-deploy-test-'));
    repository = new OrganizationRepository(
      connectDb(dataDir, join(import.meta.dir, '..', '..', 'drizzle')),
    );
  });

  afterAll(() => {
    rmSync(dataDir, { recursive: true, force: true });
  });

  test('sans hook configuré → E_NO_DEPLOY_HOOK', async () => {
    const service = new OrganizationService(repository);
    expect(service.deploy()).rejects.toThrow('E_NO_DEPLOY_HOOK');
  });

  test('hook configuré → GET émis et statut retourné', async () => {
    await repository.insert({
      name: 'Pertuis',
      slug: 'ot-pertuis',
      deployment: { vercel: { hook: 'https://api.vercel.example/hook/abc' } },
    });
    const calls: string[] = [];
    const service = new OrganizationService(repository, {
      fetchImpl: (async (input: unknown) => {
        calls.push(String(input));
        return new Response('ok', { status: 201 });
      }) as typeof fetch,
    });
    expect(await service.deploy()).toEqual({ status: 201 });
    expect(calls).toEqual(['https://api.vercel.example/hook/abc']);
  });

  test('hook en erreur → échec rapporté (plus d’avalement legacy)', async () => {
    const service = new OrganizationService(repository, {
      fetchImpl: (async () => new Response('boom', { status: 500 })) as typeof fetch,
    });
    expect(service.deploy()).rejects.toThrow('hook Vercel: 500');
  });
});
