import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures.ts';
import { API_URL, seed } from './instance.ts';

const { Given, When, Then } = createBdd(test);

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
