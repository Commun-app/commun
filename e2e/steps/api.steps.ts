import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { trpcMutate, trpcQuery } from '../clients/client-trpc.ts';
import { PAYLOADS } from '../data/index.ts';
import { test, type World } from './fixtures.ts';

const { Then, When } = createBdd(test);

/**
 * Steps GÉNÉRIQUES d'appel de procédure (proposition Quentin, revue PR #1,
 * généralisés le 28/07) — le style lisible développeur, partagé par toutes
 * les features :
 *
 *   Then calling procedure "users.list" fails with "FORBIDDEN"
 *   And calling procedure "collections.create" with payload "collection-interdite" fails with "FORBIDDEN"
 *   And calling procedure "users.list" succeeds
 *
 * Conventions :
 * - SANS payload → query (GET) ; AVEC payload → mutation (POST)
 * - le payload est une donnée statique NOMMÉE de e2e/data (PAYLOADS)
 * - les valeurs "$clef" d'un payload sont INTERPOLÉES depuis l'état du
 *   scénario (world.clef) — ex : "$collectionId" posé par un step précédent
 */

const ERROR_STATUS: Record<string, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
};

/** Résout "$clef" (récursivement) depuis l'état du scénario. */
function interpolate(value: unknown, world: World): unknown {
  if (typeof value === 'string' && value.startsWith('$')) {
    const key = value.slice(1) as keyof World;
    if (world[key] === undefined) throw new Error(`variable de scénario absente: ${value}`);
    return world[key];
  }
  if (Array.isArray(value)) return value.map((item) => interpolate(item, world));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, interpolate(item, world)]),
    );
  }
  return value;
}

function payloadOf(name: string, world: World): unknown {
  const payload = PAYLOADS[name];
  if (payload === undefined) throw new Error(`payload statique inconnu: "${name}" (e2e/data)`);
  return interpolate(structuredClone(payload), world);
}

Then('calling procedure {string} fails with {string}', async ({ world }, procedure, error) => {
  const response = await trpcQuery(procedure, { token: world.sessionToken });
  expect(response.status).toBe(ERROR_STATUS[error] ?? Number(error));
});

Then(
  'calling procedure {string} with payload {string} fails with {string}',
  async ({ world }, procedure, payload, error) => {
    const response = await trpcMutate(procedure, {
      input: payloadOf(payload, world),
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
      input: payloadOf(payload, world),
      token: world.sessionToken,
    });
    expect(response.status).toBe(200);
  },
);

/** Variante mutation avec capture de l'id créé dans l'état du scénario. */
When(
  'calling procedure {string} with payload {string} capturing the id as {string}',
  async ({ world }, procedure, payload, key) => {
    const response = await trpcMutate<{ id: string }>(procedure, {
      input: payloadOf(payload, world),
      token: world.sessionToken,
    });
    expect(response.status).toBe(200);
    (world as Record<string, unknown>)[key] = response.body.result?.data.id;
  },
);
