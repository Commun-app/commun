import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures.ts';
import { API_URL, seed } from './instance.ts';

const { Given, When, Then } = createBdd(test);

const trpc = (procedure: string, token: string, input?: unknown) =>
  fetch(`${API_URL}/api/trpc/${procedure}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(input ?? {}),
  });

// ── /api/content plane ───────────────────────────────────────────────────────

When('I request the news content without a token', async ({ world }) => {
  const response = await fetch(`${API_URL}/api/content/news`);
  world.status = response.status;
});

Given(
  'an API token and a published news entry {string} plus a draft',
  ({ world }, slug: string) => {
    world.apiToken = seed<{ token: string }>('api-token', String(Date.now())).token;
    seed('news-entry', slug);
  },
);

Given('an API token', ({ world }) => {
  world.apiToken = seed<{ token: string }>('api-token', String(Date.now())).token;
});

Given('an initialized organization', () => {
  seed('organization');
});

When('I request the news content with the token', async ({ world }) => {
  const response = await fetch(`${API_URL}/api/content/news`, {
    headers: { authorization: `Bearer ${world.apiToken}` },
  });
  world.status = response.status;
  world.body = await response.json();
});

When('I request the {string} content with the token', async ({ world }, domain: string) => {
  const response = await fetch(`${API_URL}/api/content/${domain}`, {
    headers: { authorization: `Bearer ${world.apiToken}` },
  });
  world.status = response.status;
});

Then('only {string} is returned', ({ world }, slug: string) => {
  expect(world.status).toBe(200);
  const body = world.body as { news: Array<{ slug: string }> };
  expect(body.news.map((entry) => entry.slug)).toEqual([slug]);
});

Then('the content plane answers {int}', ({ world }, status: number) => {
  expect(world.status).toBe(status);
});

// ── Content lifecycle ────────────────────────────────────────────────────────

When('the admin creates a collection {string}', async ({ world }, slug: string) => {
  const response = await trpc('collections.create', world.sessionToken!, {
    name: 'Communiqués',
    slug,
    fields: [{ name: 'body', label: 'Corps', type: 'text' }],
  });
  expect(response.status).toBe(200);
});

When(
  'creates a draft entry {string} in {string}',
  async ({ world }, slug: string, collection: string) => {
    const response = await trpc('collections.entries.create', world.sessionToken!, {
      collectionId: collection,
      data: { title: 'Premier communiqué', slug, data: { body: 'Bonjour' } },
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { result: { data: { id: string } } };
    world.entryId = body.result.data.id;
  },
);

Then('the content plane for {string} is empty', async ({ world }, collection: string) => {
  const response = await fetch(`${API_URL}/api/content/${collection}`, {
    headers: { authorization: `Bearer ${world.apiToken}` },
  });
  const body = (await response.json()) as Record<string, unknown[]>;
  expect(body[collection]).toEqual([]);
});

When('the entry is published', async ({ world }) => {
  const response = await trpc('collections.entries.update', world.sessionToken!, {
    id: world.entryId,
    data: { status: 'published' },
  });
  expect(response.status).toBe(200);
});

Then(
  'the content plane for {string} contains {string}',
  async ({ world }, collection: string, slug: string) => {
    const response = await fetch(`${API_URL}/api/content/${collection}`, {
      headers: { authorization: `Bearer ${world.apiToken}` },
    });
    const body = (await response.json()) as Record<string, Array<{ slug: string }>>;
    expect(body[collection]!.map((entry) => entry.slug)).toContain(slug);
  },
);

// ── Legacy-compat plane (/api/v1) ────────────────────────────────────────────

Then(
  'the legacy records payload contains the entry with collection {string}',
  async ({ world }, collection: string) => {
    const response = await fetch(`${API_URL}/api/v1/content/records`, {
      headers: { authorization: `Bearer ${world.apiToken}` },
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: { records: Record<string, { relatedCollection: string }> };
    };
    expect(body.data.records[world.entryId!]?.relatedCollection).toBe(collection);
  },
);

Then('the legacy deployment payload lists the slug {string}', async ({ world }, slug: string) => {
  const response = await fetch(`${API_URL}/api/v1/content/deployment`, {
    headers: { authorization: `Bearer ${world.apiToken}` },
  });
  expect(response.status).toBe(200);
  const body = (await response.json()) as { data: { slugs: string[] } };
  expect(body.data.slugs).toContain(slug);
});

Then('the legacy records payload is served with a raw Authorization header', async ({ world }) => {
  // Iso legacy device clients: `Authorization: <token>` without the Bearer prefix.
  const response = await fetch(`${API_URL}/api/v1/content/records`, {
    headers: { authorization: world.apiToken! },
  });
  expect(response.status).toBe(200);
});

Then('the wordpress marseille route serves the static payload', async ({ world }) => {
  const response = await fetch(`${API_URL}/api/v1/content/wordpress-marseille-15-16`);
  world.status = response.status;
  expect(response.status).toBe(200);
  const body = (await response.json()) as { name: string; data: { users?: unknown[] } };
  expect(body.name).toBe('success');
  expect(Array.isArray(body.data.users)).toBe(true);
});
