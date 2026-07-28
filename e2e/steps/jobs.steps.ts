import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { dataOf, trpcMutate, trpcQuery } from '../clients/client-trpc.ts';
import { APIDAE_MOCK } from '../constants.ts';
import { APIDAE_DEFINITION } from '../data/apidae/index.ts';
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
interface DailyReport {
  sync: { result: SyncReport };
  deploy: { result: { triggered: boolean } };
}

function syncReport(world: World): SyncReport {
  return world.taskResult as SyncReport;
}
function firstPipeline(world: World): PipelineReport {
  const [pipeline] = syncReport(world).pipelines;
  expect(pipeline).toBeDefined();
  return pipeline!;
}

interface EntryRow {
  id: string;
  title: string;
  status: string;
  data: Record<string, unknown>;
}

/** Les entrées de la collection APIDAE, via la même surface tRPC que l'admin. */
async function agendaEntries(world: World): Promise<EntryRow[]> {
  const definitions = dataOf<Array<{ id: string; slug: string }>>(
    await trpcQuery('collections.list', { token: world.sessionToken }),
  );
  const definition = definitions.find((d) => d.slug === APIDAE_DEFINITION.slug);
  expect(definition).toBeDefined();
  return dataOf<EntryRow[]>(
    await trpcQuery('collections.entries.list', {
      input: { collectionId: definition!.id },
      token: world.sessionToken,
    }),
  );
}

async function entryByApidaeId(world: World, apidaeId: string): Promise<EntryRow> {
  const entry = (await agendaEntries(world)).find((row) => row.data.apidaeId === apidaeId);
  expect(entry, `entrée apidaeId=${apidaeId} introuvable`).toBeDefined();
  return entry!;
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

Then('the deployment fails with {string}', ({ world }, code: string) => {
  expect(world.status).toBe(400);
  expect(JSON.stringify(world.body)).toContain(code);
});

Then('the deployment succeeds and the Vercel hook was called', ({ world }) => {
  expect(world.status).toBe(200);
  expect(vercelHookHits()).toBeGreaterThan(world.hookHitsBefore ?? 0);
});

Then('the daily report carries the sync failure and a triggered deploy', ({ world }) => {
  const daily = world.taskResult as DailyReport;
  expect(daily.deploy.result.triggered).toBe(true);
  const [pipeline] = daily.sync.result.pipelines;
  expect(pipeline?.collectFailed).toBe(true);
});

// ── Rapport de sync ──────────────────────────────────────────────────────────

Then(
  'the sync report counts {int} created, {int} updated and {int} expired object(s)',
  ({ world }, created: number, updated: number, expired: number) => {
    const pipeline = firstPipeline(world);
    expect(pipeline.errors).toEqual([]);
    expect(pipeline.created).toBe(created);
    expect(pipeline.updated).toBe(updated);
    expect(pipeline.expired).toBe(expired);
  },
);

Then('the airtable pipeline was ignored', ({ world }) => {
  expect(syncReport(world).ignored).toBe(1);
});

Then('the sync report reused the existing media without re-uploading', ({ world }) => {
  const pipeline = firstPipeline(world);
  expect(pipeline.mediaReused).toBe(1);
  expect(pipeline.mediaUploaded).toBe(0);
});

Then('the sync report flags a collect failure with the unlink skipped', ({ world }) => {
  const pipeline = firstPipeline(world);
  expect(pipeline.collectFailed).toBe(true);
  expect(pipeline.unlinkSkipped).toBe(true);
  expect(pipeline.errors.length).toBeGreaterThan(0);
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
    // Enums réduits aux ids (iso legacy).
    expect(entry.data.services).toEqual([1234, 999]);
    // Média uploadé et référencé par id.
    const cover = entry.data.cover as string[];
    expect(cover).toHaveLength(1);
    expect(typeof cover[0]).toBe('string');
  },
);

Then('the collection holds a single entry per APIDAE id', async ({ world }) => {
  const entries = await agendaEntries(world);
  const ids = entries.map((row) => row.data.apidaeId).filter(Boolean);
  expect(new Set(ids).size).toBe(ids.length);
});
