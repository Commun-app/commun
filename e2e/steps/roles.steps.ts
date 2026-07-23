import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures.ts';
import { API_URL, seed } from './instance.ts';

const { Given, Then } = createBdd(test);

const call = (procedure: string, token: string, input?: unknown) =>
  fetch(`${API_URL}/api/trpc/${procedure}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(input ?? {}),
  });

Given('a logged-in {string} session', ({ world }, role: string) => {
  world.sessionToken = seed<{ token: string }>('session', role).token;
});

Then('listing users is FORBIDDEN', async ({ world }) => {
  const response = await fetch(`${API_URL}/api/trpc/users.list`, {
    headers: { authorization: `Bearer ${world.sessionToken}` },
  });
  expect(response.status).toBe(403);
});

Then('creating a collection is FORBIDDEN', async ({ world }) => {
  const response = await call('collections.create', world.sessionToken!, {
    name: 'Interdit',
    slug: 'interdit',
    fields: [{ name: 'body', label: 'Corps', type: 'text' }],
  });
  expect(response.status).toBe(403);
});

Then('listing users succeeds', async ({ world }) => {
  const response = await fetch(`${API_URL}/api/trpc/users.list`, {
    headers: { authorization: `Bearer ${world.sessionToken}` },
  });
  expect(response.status).toBe(200);
});

Then('inviting {string} as redacteur returns a single-use link', async ({ world }, email: string) => {
  const response = await call('users.invite', world.sessionToken!, { email, role: 'redacteur' });
  expect(response.status).toBe(200);
  const body = (await response.json()) as { result: { data: { token: string } } };
  expect(body.result.data.token.length).toBeGreaterThan(20);
});
