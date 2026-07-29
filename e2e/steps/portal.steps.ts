// TEMPORAIRE (review PR #6) : apps/portal est un dépannage de migration —
// la vraie app portail (cloud commun.app) sera PRIVÉE et hors monorepo ;
// cette feature partira avec elle (phase 6-7).
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { trpcQuery } from '../clients/client-trpc.ts';
import { API_URL, DEFAULT_PASSWORD, PORTAL_URL } from '../constants.ts';
import { test, type World } from './fixtures.ts';
import { seed } from './instance.ts';

const { Given, When, Then } = createBdd(test);

async function portalLogin(world: World, email: string, password: string) {
  const response = await fetch(`${PORTAL_URL}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  world.status = response.status;
  world.body = await response.json();
}

// biome-ignore lint/correctness/noEmptyPattern: playwright-bdd exige un pattern destructuré en premier argument
Given('a portal-mapped account {string}', ({}, email: string) => {
  seed('account', email);
});

When('the portal signs in {string} with the default password', async ({ world }, email: string) => {
  await portalLogin(world, email, DEFAULT_PASSWORD);
});

When(
  'the portal signs in {string} with password {string}',
  async ({ world }, email: string, password: string) => {
    await portalLogin(world, email, password);
  },
);

Then('the portal returns an sso hand-off URL for the mapped instance', ({ world }) => {
  expect(world.status).toBe(200);
  const { url } = world.body as { url: string };
  // Remise de session en FRAGMENT (jamais en query — rien dans les logs).
  expect(url).toMatch(new RegExp(`^${API_URL}/sso#token=.+`));
});

Then('the hand-off token opens a session on the instance', async ({ world }) => {
  const { url } = world.body as { url: string };
  const token = decodeURIComponent(url.split('#token=')[1] ?? '');
  const response = await trpcQuery<{ user: { email: string } }>('auth.me', { token });
  expect(response.status).toBe(200);
  expect(response.body.result?.data?.user?.email).toBe('portal@e2e.fr');
});

Then('the portal answers {int} with {string}', ({ world }, status: number, message: string) => {
  expect(world.status).toBe(status);
  expect((world.body as { error: string }).error).toBe(message);
});
