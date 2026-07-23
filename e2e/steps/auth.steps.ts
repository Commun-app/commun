import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures.ts';
import { API_URL, seed } from './instance.ts';

const { Given, When, Then } = createBdd(test);

const trpcUrl = (procedure: string) => `${API_URL}/api/trpc/${procedure}`;

async function callMe(cookie?: string) {
  const response = await fetch(trpcUrl('auth.me'), {
    headers: cookie ? { cookie } : {},
  });
  return { status: response.status, body: await response.json() };
}

When('I call the protected me procedure without a session', async ({ world }) => {
  const result = await callMe();
  world.status = result.status;
});

Then('the API answers UNAUTHORIZED', ({ world }) => {
  expect(world.status).toBe(401);
});

Given('a virgin instance with an admin invitation for {string}', ({ world }, email: string) => {
  world.inviteToken = seed<{ token: string }>('invitation', email).token;
});

When('the invitee accepts the invitation and sets a password', async ({ world }) => {
  const response = await fetch(trpcUrl('auth.acceptInvitation'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: world.inviteToken, name: 'E2E Admin', password: 'mot-de-passe-e2e' }),
  });
  expect(response.status).toBe(200);
  world.body = await response.json();
});

When('logs in with those credentials', async ({ world }) => {
  const body = world.body as { result: { data: { user: { email: string } } } };
  const response = await fetch(trpcUrl('auth.login'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: body.result.data.user.email, password: 'mot-de-passe-e2e' }),
  });
  expect(response.status).toBe(200);
  world.cookie = response.headers.get('set-cookie')?.split(';')[0] ?? undefined;
});

Then('a session cookie is set', ({ world }) => {
  expect(world.cookie).toMatch(/^commun_session=/);
});

Then('the me procedure returns the {string} account', async ({ world }, email: string) => {
  const result = await callMe(world.cookie);
  expect(result.status).toBe(200);
  expect(JSON.stringify(result.body)).toContain(email);
});

When('the user logs out', async ({ world }) => {
  const response = await fetch(trpcUrl('auth.logout'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: world.cookie ?? '' },
    body: JSON.stringify({}),
  });
  expect(response.status).toBe(200);
});

Then('the me procedure refuses the revoked session', async ({ world }) => {
  const result = await callMe(world.cookie);
  expect(result.status).toBe(401);
});
