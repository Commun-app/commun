import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { httpGet } from '../clients/client-http.ts';
import { test } from './fixtures.ts';
import { dataOf, trpcMutate, trpcQuery, type ApiResponse } from '../clients/client-trpc.ts';

const { When, Then } = createBdd(test);

// Adaptateurs locaux vers les helpers partagés (signature historique des steps).
const mutate = (procedure: string, token: string, input: unknown) =>
  trpcMutate(procedure, { input, token });
const query = (procedure: string, token: string, input?: unknown) =>
  trpcQuery(procedure, { input, token });
const json = async <T>(response: ApiResponse) => dataOf(response) as T;

// ── Cycle de vie complet collection + entrées ───────────────────────────────

Then(
  'the collection {string} lists {int} entry/entries',
  async ({ world }, slug: string, count: number) => {
    const response = await query('collections.entries.list', world.sessionToken!, {
      collectionId: slug,
    });
    expect(response.status).toBe(200);
    expect(await json<unknown[]>(response)).toHaveLength(count);
  },
);

Then(
  'the entry keeps its title {string} and stores {string}',
  async ({ world }, title: string, value: string) => {
    const response = await query('collections.entries.get', world.sessionToken!, {
      id: world.entryId,
    });
    const entry = await json<{ title: string; data: Record<string, unknown> }>(response);
    // Update PARTIEL iso legacy : le titre n'a pas été envoyé, il est conservé.
    expect(entry.title).toBe(title);
    expect(Object.values(entry.data)).toContain(value);
  },
);

Then(
  'the entries captured as {string} and {string} have slugs {string} and {string}',
  async ({ world }, firstKey: string, secondKey: string, firstSlug: string, secondSlug: string) => {
    const w = world as unknown as Record<string, string>;
    const slugs: string[] = [];
    for (const id of [w[firstKey], w[secondKey]]) {
      const response = await query('collections.entries.get', world.sessionToken!, { id });
      slugs.push((await json<{ slug: string }>(response)).slug);
    }
    expect(slugs).toEqual([firstSlug, secondSlug]);
  },
);

Then('the collection {string} no longer exists', async ({ world }, slug: string) => {
  const response = await query('collections.get', world.sessionToken!, { idOrSlug: slug });
  expect(response.status).toBe(404);
  // Contrat du dictionnaire d'erreurs côté client : le discriminant typé
  // voyage dans error.data.type (errorFormatter tRPC).
  expect(response.body.error?.data?.type).toBe('collection-not-found-error');
});

// ── Tous les types de champs ────────────────────────────────────────────────

Then('the entry stores every typed value', async ({ world }) => {
  const response = await query('collections.entries.get', world.sessionToken!, {
    id: world.entryId,
  });
  const entry = await json<{ data: Record<string, unknown> }>(response);
  expect(entry.data.txt).toBe('bonjour');
  expect(entry.data.num).toBe(42);
  expect(entry.data.flag).toBe(true);
  expect(entry.data.day).toBe('2026-08-01');
  expect(entry.data.choice).toBe('a');
  expect(entry.data.cover).toBe('media-id-quelconque');
  expect((entry.data.extra as { clef: number }).clef).toBe(1);
  expect(Array.isArray(entry.data.etapes)).toBe(true);
});

// ── Slugs incrémentaux ──────────────────────────────────────────────────────

// ── Cycle de vie éditorial ──────────────────────────────────────────────────

Then('the entry carries an automatic publishedAt', async ({ world }) => {
  const response = await query('collections.entries.get', world.sessionToken!, {
    id: world.entryId,
  });
  const entry = await json<{ publishedAt: string | null }>(response);
  expect(entry.publishedAt).toBeTruthy();
});

// ── Évolution de schéma (retrait / retour d'un champ) ───────────────────────

async function recordAttributes(world: { apiToken?: string; entryId?: string }) {
  const response = await httpGet<{ data: { records: Record<string, Record<string, unknown>> } }>(
    '/api/v1/content/records',
    { bearer: world.apiToken },
  );
  expect(response.status).toBe(200);
  return response.body.data.records[world.entryId!];
}

Then(
  'the records payload masks the attribute {string} for that entry',
  async ({ world }, field: string) => {
    const record = await recordAttributes(world);
    expect(record).toBeTruthy();
    expect(record).not.toHaveProperty(field);
  },
);

Then(
  'updating the field {string} of the entry still succeeds',
  async ({ world }, field: string) => {
    const response = await mutate('collections.entries.update', world.sessionToken!, {
      id: world.entryId,
      data: { data: { [field]: 'corps corrigé' } },
    });
    expect(response.status).toBe(200);
  },
);

Then(
  'the records payload serves the attribute {string} again',
  async ({ world }, field: string) => {
    const record = await recordAttributes(world);
    // La valeur orpheline a été CONSERVÉE pendant le retrait du champ.
    expect(record[field]).toBe('la note');
  },
);

// ── Pagination ───────────────────────────────────────────────────────────────

When('creates {int} entries in {string}', async ({ world }, count: number, slug: string) => {
  for (let i = 0; i < count; i++) {
    const response = await mutate('collections.entries.create', world.sessionToken!, {
      collectionId: slug,
      data: { title: `Annonce ${i + 1}`, data: {} },
    });
    expect(response.status).toBe(200);
  }
});

Then(
  'listing {string} with limit {int} returns {int} entries',
  async ({ world }, slug: string, limit: number, expected: number) => {
    const response = await query('collections.entries.list', world.sessionToken!, {
      collectionId: slug,
      limit,
    });
    expect(await json<unknown[]>(response)).toHaveLength(expected);
  },
);

Then(
  'listing {string} with skip {int} returns {int} entry',
  async ({ world }, slug: string, skip: number, expected: number) => {
    const response = await query('collections.entries.list', world.sessionToken!, {
      collectionId: slug,
      skip,
    });
    expect(await json<unknown[]>(response)).toHaveLength(expected);
  },
);
