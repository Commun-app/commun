import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures.ts';
import { httpGet } from '../clients/client-http.ts';
import { seed } from './instance.ts';

const { Given, When, Then } = createBdd(test);

// ── /api/content plane ───────────────────────────────────────────────────────

When('I request the legacy records payload without a token', async ({ world }) => {
  const response = await httpGet('/api/v1/content/records');
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

When('I request the legacy records payload with the token', async ({ world }) => {
  const response = await httpGet('/api/v1/content/records', { bearer: world.apiToken });
  world.status = response.status;
  world.body = response.body;
});

Then(
  'the records payload contains the slug {string} but not {string}',
  ({ world }, visible: string, hidden: string) => {
    expect(world.status).toBe(200);
    const body = world.body as { data: { records: Record<string, { slug: string }> } };
    const slugs = Object.values(body.data.records).map((record) => record.slug);
    expect(slugs).toContain(visible);
    expect(slugs).not.toContain(hidden);
  },
);

Then('the content plane answers {int}', ({ world }, status: number) => {
  expect(world.status).toBe(status);
});

// ── Content lifecycle ────────────────────────────────────────────────────────

Then(
  'the records payload has no entry for collection {string}',
  async ({ world }, collection: string) => {
    const response = await httpGet('/api/v1/content/records', { bearer: world.apiToken });
    const body = response.body as {
      data: { records: Record<string, { relatedCollection: string }> };
    };
    const collections = Object.values(body.data.records).map((record) => record.relatedCollection);
    expect(collections).not.toContain(collection);
  },
);

// ── Legacy-compat plane (/api/v1) ────────────────────────────────────────────

Then(
  'the legacy records payload contains the entry with collection {string}',
  async ({ world }, collection: string) => {
    const response = await httpGet('/api/v1/content/records', { bearer: world.apiToken });
    expect(response.status).toBe(200);
    const body = response.body as {
      data: { records: Record<string, { relatedCollection: string }> };
    };
    expect(body.data.records[world.entryId!]?.relatedCollection).toBe(collection);
  },
);

Then('the legacy deployment payload lists the slug {string}', async ({ world }, slug: string) => {
  const response = await httpGet('/api/v1/content/deployment', { bearer: world.apiToken });
  expect(response.status).toBe(200);
  const body = response.body as { data: { slugs: string[] } };
  expect(body.data.slugs).toContain(slug);
});

Then('the legacy records payload is served with a raw Authorization header', async ({ world }) => {
  // Iso legacy device clients: `Authorization: <token>` without the Bearer prefix.
  const response = await httpGet('/api/v1/content/records', { rawAuth: world.apiToken });
  expect(response.status).toBe(200);
});

Then('the wordpress marseille route serves the static payload', async ({ world }) => {
  const response = await httpGet('/api/v1/content/wordpress-marseille-15-16');
  world.status = response.status;
  expect(response.status).toBe(200);
  const body = response.body as { name: string; data: { users?: unknown[] } };
  expect(body.name).toBe('success');
  expect(Array.isArray(body.data.users)).toBe(true);
});
