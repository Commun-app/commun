import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures.ts';
import { seed } from './instance.ts';
import { dataOf, trpcMutate, trpcQuery } from '../clients/client-trpc.ts';

const { Given, When, Then } = createBdd(test);

Given('a logged-in {string} session', ({ world }, role: string) => {
  world.sessionToken = seed<{ token: string }>('session', role).token;
});

Then(
  'inviting {string} as redacteur returns a single-use link',
  async ({ world }, email: string) => {
    const response = await trpcMutate<{ token: string }>('users.invite', {
      input: { email, role: 'redacteur' },
      token: world.sessionToken,
    });
    expect(response.status).toBe(200);
    expect(dataOf(response).token.length).toBeGreaterThan(20);
  },
);

// ── Compte appelant, annuaire, gestion des membres ───────────────────────────

Then('the me procedure reports the {string} role', async ({ world }, role: string) => {
  const response = await trpcQuery<{ user: { role: string } }>('auth.me', {
    token: world.sessionToken,
  });
  expect(response.status).toBe(200);
  expect(dataOf(response).user.role).toBe(role);
});

Then('the member directory lists names without emails', async ({ world }) => {
  const response = await trpcQuery<Array<Record<string, unknown>>>('users.directory', {
    token: world.sessionToken,
  });
  expect(response.status).toBe(200);
  expect(dataOf(response).length).toBeGreaterThan(0);
  for (const member of dataOf(response)) {
    expect(typeof member.name).toBe('string');
    expect(member).not.toHaveProperty('email');
  }
});

Given('another member exists with role {string}', async ({ world }, role: string) => {
  const { token } = seed<{ token: string }>('session', role);
  const response = await trpcQuery<{ user: { id: string } }>('auth.me', { token });
  world.memberId = dataOf(response).user.id;
});

When(
  'the admin renames that member to {string} with role {string}',
  async ({ world }, name: string, role: string) => {
    const response = await trpcMutate('users.update', {
      input: { id: world.memberId, data: { name, role } },
      token: world.sessionToken,
    });
    expect(response.status).toBe(200);
  },
);

Then(
  'the member appears as {string} with role {string}',
  async ({ world }, name: string, role: string) => {
    const response = await trpcQuery<{ name: string; role: string }>('users.get', {
      input: { id: world.memberId },
      token: world.sessionToken,
    });
    expect(response.status).toBe(200);
    expect(dataOf(response).name).toBe(name);
    expect(dataOf(response).role).toBe(role);
  },
);

// ── Suppression de membre & auto-suppression ─────────────────────────────────

When('the admin removes that member', async ({ world }) => {
  const removal = await trpcMutate('users.remove', {
    input: { id: world.memberId },
    token: world.sessionToken,
  });
  expect(removal.status).toBe(200);
});

Then('the member no longer exists', async ({ world }) => {
  const response = await trpcQuery('users.get', {
    input: { id: world.memberId },
    token: world.sessionToken,
  });
  expect(response.status).toBe(404);
});

Then('removing their own account is refused', async ({ world }) => {
  const me = await trpcQuery<{ user: { id: string } }>('auth.me', { token: world.sessionToken });
  const response = await trpcMutate('users.remove', {
    input: { id: dataOf(me).user.id },
    token: world.sessionToken,
  });
  expect(response.status).toBe(400);
});

// ── Organisation (singleton single-tenant) ───────────────────────────────────

When('the admin updates the organization name to {string}', async ({ world }, name: string) => {
  const response = await trpcMutate('organization.update', {
    input: { name },
    token: world.sessionToken,
  });
  expect(response.status).toBe(200);
});

Then('the organization reads {string}', async ({ world }, name: string) => {
  const response = await trpcQuery<{ name: string }>('organization.get', {
    token: world.sessionToken,
  });
  expect(response.status).toBe(200);
  expect(dataOf(response).name).toBe(name);
});
