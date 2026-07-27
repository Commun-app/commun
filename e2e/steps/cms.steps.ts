import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures.ts';
import { API_URL } from './instance.ts';

const { Given, When, Then } = createBdd(test);

const mutate = (procedure: string, token: string, input: unknown) =>
  fetch(`${API_URL}/api/trpc/${procedure}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });

const query = (procedure: string, token: string, input?: unknown) =>
  fetch(
    `${API_URL}/api/trpc/${procedure}${input ? `?input=${encodeURIComponent(JSON.stringify(input))}` : ''}`,
    { headers: { authorization: `Bearer ${token}` } },
  );

const json = async <T>(response: Response) =>
  ((await response.json()) as { result: { data: T } }).result.data;

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

When(
  'the entry data field {string} is updated to {string}',
  async ({ world }, field: string, value: string) => {
    const response = await mutate('collections.entries.update', world.sessionToken!, {
      id: world.entryId,
      data: { data: { [field]: value } },
    });
    expect(response.status).toBe(200);
  },
);

Then('the entry keeps its title and stores {string}', async ({ world }, value: string) => {
  const response = await query('collections.entries.get', world.sessionToken!, {
    id: world.entryId,
  });
  const entry = await json<{ title: string; data: Record<string, unknown> }>(response);
  // Update PARTIEL iso legacy : le titre n'a pas été envoyé, il est conservé.
  expect(entry.title).toBe('Premier communiqué');
  expect(Object.values(entry.data)).toContain(value);
});

When('the entry is removed', async ({ world }) => {
  const response = await mutate('collections.entries.remove', world.sessionToken!, {
    id: world.entryId,
  });
  expect(response.status).toBe(200);
});

When('the collection {string} is removed', async ({ world }, slug: string) => {
  const definition = await json<{ id: string }>(
    await query('collections.get', world.sessionToken!, { idOrSlug: slug }),
  );
  const response = await mutate('collections.remove', world.sessionToken!, { id: definition.id });
  expect(response.status).toBe(200);
});

Then('the collection {string} no longer exists', async ({ world }, slug: string) => {
  const response = await query('collections.get', world.sessionToken!, { idOrSlug: slug });
  expect(response.status).toBe(404);
});

// ── Tous les types de champs ────────────────────────────────────────────────

const EVERY_FIELD_TYPE = [
  { name: 'txt', label: 'Texte', type: 'text' },
  { name: 'rich', label: 'Riche', type: 'rich-text' },
  { name: 'num', label: 'Nombre', type: 'number' },
  { name: 'flag', label: 'Booléen', type: 'boolean' },
  { name: 'day', label: 'Date', type: 'date' },
  { name: 'cover', label: 'Média', type: 'media' },
  { name: 'linked', label: 'Relation', type: 'relation', target: 'news' },
  { name: 'choice', label: 'Choix', type: 'select', options: ['a', 'b'] },
  { name: 'etapes', label: 'Étapes', type: 'steps' },
  { name: 'extra', label: 'JSON', type: 'json' },
];

const VALID_EVERY_TYPE = {
  txt: 'bonjour',
  rich: { type: 'doc', content: [] },
  num: 42,
  flag: true,
  day: '2026-08-01',
  cover: 'media-id-quelconque',
  linked: [],
  choice: 'a',
  etapes: [{ titre: 'Étape 1', content: { type: 'doc' } }],
  extra: { clef: 1 },
};

Given('a collection {string} defining every field type', async ({ world }, name: string) => {
  // Slug unique par scénario (le slug est contraint unique en base).
  const response = await mutate('collections.create', world.sessionToken!, {
    name,
    slug: `${name}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    fields: EVERY_FIELD_TYPE,
  });
  expect(response.status).toBe(200);
  world.collectionId = (await json<{ id: string }>(response)).id;
});

When('an entry is created with valid values for every field type', async ({ world }) => {
  const response = await mutate('collections.entries.create', world.sessionToken!, {
    collectionId: world.collectionId,
    data: { title: 'Entrée typée', data: VALID_EVERY_TYPE },
  });
  expect(response.status).toBe(200);
  world.entryId = (await json<{ id: string }>(response)).id;
});

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

async function expectEntryRejected(
  world: { sessionToken?: string; collectionId?: string },
  data: Record<string, unknown>,
) {
  const response = await mutate('collections.entries.create', world.sessionToken!, {
    collectionId: world.collectionId,
    data: { title: 'Invalide', data },
  });
  expect(response.status).toBe(400);
}

Then(
  'a {string} field refuses the string {string}',
  async ({ world }, _type: string, value: string) => {
    await expectEntryRejected(world, { flag: value });
  },
);

Then('a {string} field refuses a value outside its options', async ({ world }, _type: string) => {
  await expectEntryRejected(world, { choice: 'z' });
});

Then('an unknown field name is rejected', async ({ world }) => {
  await expectEntryRejected(world, { inconnu: 'x' });
});

Then('defining a collection with an optionless select is rejected', async ({ world }) => {
  const response = await mutate('collections.create', world.sessionToken!, {
    name: 'Sans options',
    slug: `sans-options-${Date.now()}`,
    fields: [{ name: 'choix', label: 'Choix', type: 'select' }],
  });
  expect(response.status).toBe(400);
});

// ── Slugs incrémentaux ──────────────────────────────────────────────────────

When(
  'creates two entries titled {string} in {string}',
  async ({ world }, title: string, slug: string) => {
    world.entryIds = [];
    for (let i = 0; i < 2; i++) {
      const response = await mutate('collections.entries.create', world.sessionToken!, {
        collectionId: slug,
        data: { title, data: {} },
      });
      expect(response.status).toBe(200);
      world.entryIds.push((await json<{ id: string }>(response)).id);
    }
  },
);

Then('their slugs are {string} and {string}', async ({ world }, first: string, second: string) => {
  const slugs: string[] = [];
  for (const id of world.entryIds!) {
    const response = await query('collections.entries.get', world.sessionToken!, { id });
    slugs.push((await json<{ slug: string }>(response)).slug);
  }
  expect(slugs).toEqual([first, second]);
});

// ── Cycle de vie éditorial ──────────────────────────────────────────────────

When(
  'the entry moves through the statuses {string} and {string}',
  async ({ world }, first: string, second: string) => {
    for (const status of [first, second]) {
      const response = await mutate('collections.entries.update', world.sessionToken!, {
        id: world.entryId,
        data: { status },
      });
      expect(response.status).toBe(200);
    }
  },
);

Then('the entry carries an automatic publishedAt', async ({ world }) => {
  const response = await query('collections.entries.get', world.sessionToken!, {
    id: world.entryId,
  });
  const entry = await json<{ publishedAt: string | null }>(response);
  expect(entry.publishedAt).toBeTruthy();
});
