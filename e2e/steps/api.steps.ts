import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { PAYLOADS } from '../data/index.ts';
import { test } from './fixtures.ts';
import { trpcMutate, trpcQuery } from './trpc.ts';

const { Then } = createBdd(test);

/**
 * Steps GÉNÉRIQUES d'appel de procédure (proposition Quentin, revue PR #1) —
 * partagés par toutes les features pour les cas de garde (permissions,
 * erreurs) :
 *
 *   Then calling procedure "users.list" fails with "FORBIDDEN"
 *   And calling procedure "collections.create" with payload "collection-interdite" fails with "FORBIDDEN"
 *   And calling procedure "users.list" succeeds
 *
 * Convention : SANS payload → query (GET) ; AVEC payload → mutation (POST),
 * le payload étant une donnée statique NOMMÉE de e2e/data (PAYLOADS).
 * Les parcours métier, eux, gardent des steps en langage métier.
 */

const ERROR_STATUS: Record<string, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
};

function payloadOf(name: string): unknown {
  const payload = PAYLOADS[name];
  if (payload === undefined) throw new Error(`payload statique inconnu: "${name}" (e2e/data)`);
  return payload;
}

Then('calling procedure {string} fails with {string}', async ({ world }, procedure, error) => {
  const response = await trpcQuery(procedure, { token: world.sessionToken });
  expect(response.status).toBe(ERROR_STATUS[error] ?? Number(error));
});

Then(
  'calling procedure {string} with payload {string} fails with {string}',
  async ({ world }, procedure, payload, error) => {
    const response = await trpcMutate(procedure, {
      input: payloadOf(payload),
      token: world.sessionToken,
    });
    expect(response.status).toBe(ERROR_STATUS[error] ?? Number(error));
  },
);

Then('calling procedure {string} succeeds', async ({ world }, procedure) => {
  const response = await trpcQuery(procedure, { token: world.sessionToken });
  expect(response.status).toBe(200);
});

Then(
  'calling procedure {string} with payload {string} succeeds',
  async ({ world }, procedure, payload) => {
    const response = await trpcMutate(procedure, {
      input: payloadOf(payload),
      token: world.sessionToken,
    });
    expect(response.status).toBe(200);
  },
);
