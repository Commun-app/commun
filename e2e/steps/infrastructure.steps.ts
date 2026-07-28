import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures.ts';
import { makeTrpc } from '../clients/client-trpc.ts';

const { When, Then } = createBdd(test);

When('I request the API health endpoint', async ({ request, world }) => {
  const res = await request.get('/health');
  world.status = res.status();
  world.body = await res.json();
});

Then('the API reports it is healthy', async ({ world }) => {
  expect(world.status).toBe(200);
  expect(world.body).toMatchObject({ status: 'ok', service: '@commun/core' });
});

When('I query the core health check', async ({ world }) => {
  world.body = await makeTrpc().health.ping.query();
});

Then('it reports database connectivity', ({ world }) => {
  const health = world.body as { status: string; service: string; db: { ok: boolean } };
  expect(health.status).toBe('ok');
  expect(health.service).toBe('@commun/core');
  expect(health.db.ok).toBe(true);
});
