import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { dataOf, trpcMutate, trpcQuery } from '../clients/client-trpc.ts';
import { APIDAE_MOCK } from '../constants.ts';
import { APIDAE_DEFINITIONS } from '../data/apidae/index.ts';
import {
  removeObjet,
  setApidaeDown,
  startApidaeMock,
  vercelHookHits,
} from '../mocks/apidae.mock.ts';
import { test, type World } from './fixtures.ts';
import { API_URL, seed } from './instance.ts';

const { Given, When, Then } = createBdd(test);

// ── Rapports des tasks (formes retournées par apps/api/server/tasks) ─────────

interface PipelineReport {
  collection: string;
  created: number;
  updated: number;
  expired: number;
  errors: string[];
  collectFailed: boolean;
  mediaUploaded: number;
  mediaReused: number;
  unlinkSkipped: boolean;
}
interface SyncReport {
  status: string;
  ignored: number;
  pipelines: PipelineReport[];
}

function syncReport(world: World): SyncReport {
  return world.taskResult as SyncReport;
}

function pipelineFor(world: World, collectionSlug: string): PipelineReport {
  const pipeline = syncReport(world).pipelines.find(
    (candidate) => candidate.collection === collectionSlug,
  );
  expect(pipeline, `pipeline ${collectionSlug} absent du rapport`).toBeDefined();
  return pipeline!;
}

interface EntryRow {
  id: string;
  title: string;
  status: string;
  data: Record<string, unknown>;
}

/** Les entrées d'une collection APIDAE, via la même surface tRPC que l'admin. */
async function entriesOf(world: World, slug: string): Promise<EntryRow[]> {
  const definitions = dataOf<Array<{ id: string; slug: string }>>(
    await trpcQuery('collections.list', { token: world.sessionToken }),
  );
  const definition = definitions.find((d) => d.slug === slug);
  expect(definition, `définition ${slug} introuvable`).toBeDefined();
  return dataOf<EntryRow[]>(
    await trpcQuery('collections.entries.list', {
      input: { collectionId: definition!.id, limit: 100 },
      token: world.sessionToken,
    }),
  );
}

/** Une entrée par son apidaeId, cherchée dans les deux collections APIDAE. */
async function entryByApidaeId(world: World, apidaeId: string): Promise<EntryRow> {
  for (const definition of APIDAE_DEFINITIONS) {
    const entry = (await entriesOf(world, definition.slug)).find(
      (row) => row.data.apidaeId === apidaeId,
    );
    if (entry) return entry;
  }
  throw new Error(`entrée apidaeId=${apidaeId} introuvable`);
}

// ── Infrastructure ───────────────────────────────────────────────────────────

Given('the APIDAE mock is up', async () => {
  await startApidaeMock();
  setApidaeDown(false);
});

Given('the instance is configured with the ot-pertuis injector', () => {
  // Le sink média écrit sur le MinIO E2E : provisionner le bucket ici — en CI
  // jobs.feature peut passer AVANT media.feature (qui le crée aussi).
  seed('bucket');
  seed('apidae');
});

Given('the APIDAE API is down', () => {
  setApidaeDown(true);
});

// biome-ignore lint/correctness/noEmptyPattern: playwright-bdd exige un pattern destructuré en premier argument
When('the object {string} disappears from the APIDAE selection', ({}, apidaeId: string) => {
  removeObjet(Number(apidaeId));
});

When('the {string} task runs', async ({ world }, name: string) => {
  // Route interne COMMUN_TASKS_HTTP (le endpoint tasks de Nitro n'existe
  // qu'en dev, or la suite boote le bundle de production).
  const response = await fetch(`${API_URL}/_tasks/${name}`, { method: 'POST' });
  expect(response.status).toBe(200);
  world.taskResult = ((await response.json()) as { result?: unknown }).result;
});

// ── Deploy ───────────────────────────────────────────────────────────────────

Given('no Vercel deploy hook is configured', async ({ world }) => {
  const response = await trpcMutate('organization.update', {
    input: { deployment: {} },
    token: world.sessionToken,
  });
  expect(response.status).toBe(200);
});

Given('the Vercel deploy hook points at the local mock', async ({ world }) => {
  const response = await trpcMutate('organization.update', {
    input: { deployment: { vercel: { hook: APIDAE_MOCK.hookUrl } } },
    token: world.sessionToken,
  });
  expect(response.status).toBe(200);
});

When('the site deployment is triggered', async ({ world }) => {
  world.hookHitsBefore = vercelHookHits();
  const response = await trpcMutate('organization.deploy', { token: world.sessionToken });
  world.status = response.status;
  world.body = response.body;
});

// Assert on the error TYPE, never on its message: the type is the contract the
// interface matches on, the message is optional context for logs.
Then('the deployment fails with {string}', ({ world }, type: string) => {
  expect(world.status).toBe(400);
  expect((world.body as { error?: { data?: { type?: string } } })?.error?.data?.type).toBe(type);
});

Then('the deployment succeeds and the Vercel hook was called', ({ world }) => {
  expect(world.status).toBe(200);
  expect(vercelHookHits()).toBeGreaterThan(world.hookHitsBefore ?? 0);
});

// ── Rapport de sync ──────────────────────────────────────────────────────────

Then(
  'the sync report for {string} counts {int} created, {int} updated and {int} expired',
  ({ world }, slug: string, created: number, updated: number, expired: number) => {
    const pipeline = pipelineFor(world, slug);
    expect(pipeline.errors).toEqual([]);
    expect(pipeline.created).toBe(created);
    expect(pipeline.updated).toBe(updated);
    expect(pipeline.expired).toBe(expired);
  },
);

Then('the airtable pipeline was ignored', ({ world }) => {
  expect(syncReport(world).ignored).toBe(1);
});

Then('the sync report reused every existing media without re-uploading', ({ world }) => {
  for (const pipeline of syncReport(world).pipelines) {
    expect(pipeline.mediaUploaded).toBe(0);
    expect(pipeline.mediaReused).toBeGreaterThan(0);
  }
});

Then('the sync report flags a collect failure with the unlink skipped', ({ world }) => {
  for (const pipeline of syncReport(world).pipelines) {
    expect(pipeline.collectFailed).toBe(true);
    expect(pipeline.unlinkSkipped).toBe(true);
    expect(pipeline.errors.length).toBeGreaterThan(0);
  }
});

// ── Contenu synchronisé ──────────────────────────────────────────────────────

Then('the entry for APIDAE id {string} is published', async ({ world }, apidaeId: string) => {
  expect((await entryByApidaeId(world, apidaeId)).status).toBe('published');
});

Then('the entry for APIDAE id {string} is back to draft', async ({ world }, apidaeId: string) => {
  expect((await entryByApidaeId(world, apidaeId)).status).toBe('draft');
});

Then(
  'the pre-existing published entry {string} is back to draft',
  async ({ world }, apidaeId: string) => {
    expect((await entryByApidaeId(world, apidaeId)).status).toBe('draft');
  },
);

Then('the media library holds the APIDAE illustration {string}', async ({ world }, id: string) => {
  const rows = dataOf<Array<{ metaData?: { apidaeId?: string } }>>(
    await trpcQuery('media.list', { token: world.sessionToken }),
  );
  expect(rows.some((row) => row.metaData?.apidaeId === id)).toBe(true);
});

Then(
  'the entry for APIDAE id {string} stores the schedules, the enum ids and the cover media',
  async ({ world }, apidaeId: string) => {
    const entry = await entryByApidaeId(world, apidaeId);
    // Périodes sérialisées en ISO par @apidaeSchedules.
    const schedules = entry.data.schedules as { periods: Array<{ fromDate: string }> };
    expect(schedules.periods.length).toBeGreaterThan(0);
    expect(schedules.periods[0]?.fromDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // Enums réduits aux ids (iso legacy) — jamais des objets { id, libelleFr }.
    const services = entry.data.services as unknown[];
    expect(services.length).toBeGreaterThan(0);
    expect(services.every((value) => typeof value !== 'object')).toBe(true);
    // Médias uploadés et référencés par id.
    const cover = entry.data.cover as string[];
    expect(cover.length).toBeGreaterThan(0);
    expect(typeof cover[0]).toBe('string');
  },
);

Then('each collection holds a single entry per APIDAE id', async ({ world }) => {
  for (const definition of APIDAE_DEFINITIONS) {
    const entries = await entriesOf(world, definition.slug);
    const ids = entries.map((row) => row.data.apidaeId).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
  }
});
