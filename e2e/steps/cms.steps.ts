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

// ── Évolution de schéma (retrait / retour d'un champ) ───────────────────────

const FICHES_FIELDS = {
  both: [
    { name: 'corps', label: 'Corps', type: 'text' },
    { name: 'note', label: 'Note', type: 'text' },
  ],
  corpsOnly: [{ name: 'corps', label: 'Corps', type: 'text' }],
};

When(
  'the admin creates a collection {string} with fields {string} and {string}',
  async ({ world }, slug: string, _a: string, _b: string) => {
    const response = await mutate('collections.create', world.sessionToken!, {
      name: 'Fiches',
      slug,
      fields: FICHES_FIELDS.both,
    });
    expect(response.status).toBe(200);
    world.collectionId = (await json<{ id: string }>(response)).id;
  },
);

When(
  'creates a published entry in {string} with {string} and {string} filled',
  async ({ world }, slug: string, _a: string, _b: string) => {
    const response = await mutate('collections.entries.create', world.sessionToken!, {
      collectionId: slug,
      data: {
        title: 'Fiche complète',
        status: 'published',
        data: { corps: 'le corps', note: 'la note' },
      },
    });
    expect(response.status).toBe(200);
    world.entryId = (await json<{ id: string }>(response)).id;
  },
);

When(
  'the field {string} is removed from the collection {string}',
  async ({ world }, _field: string, _slug: string) => {
    const response = await mutate('collections.update', world.sessionToken!, {
      id: world.collectionId,
      data: { fields: FICHES_FIELDS.corpsOnly },
    });
    expect(response.status).toBe(200);
  },
);

When(
  'the field {string} is added back to the collection {string}',
  async ({ world }, _field: string, _slug: string) => {
    const response = await mutate('collections.update', world.sessionToken!, {
      id: world.collectionId,
      data: { fields: FICHES_FIELDS.both },
    });
    expect(response.status).toBe(200);
  },
);

async function recordAttributes(world: { apiToken?: string; entryId?: string }) {
  const response = await fetch(`${API_URL}/api/v1/content/records`, {
    headers: { authorization: `Bearer ${world.apiToken}` },
  });
  expect(response.status).toBe(200);
  const body = (await response.json()) as {
    data: { records: Record<string, Record<string, unknown>> };
  };
  return body.data.records[world.entryId!];
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

// ── Publication programmée ───────────────────────────────────────────────────

When('the entry is published with a publishedAt one hour in the future', async ({ world }) => {
  const response = await mutate('collections.entries.update', world.sessionToken!, {
    id: world.entryId,
    data: { status: 'published', publishedAt: new Date(Date.now() + 3600_000).toISOString() },
  });
  expect(response.status).toBe(200);
});
