import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures.ts';
import { API_URL, seed } from './instance.ts';

const { Given, When, Then } = createBdd(test);

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

Then(
  'inviting {string} as redacteur returns a single-use link',
  async ({ world }, email: string) => {
    const response = await call('users.invite', world.sessionToken!, { email, role: 'redacteur' });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { result: { data: { token: string } } };
    expect(body.result.data.token.length).toBeGreaterThan(20);
  },
);

// ── Compte appelant, annuaire, gestion des membres ───────────────────────────

Then('the me procedure reports the {string} role', async ({ world }, role: string) => {
  const response = await fetch(`${API_URL}/api/trpc/auth.me`, {
    headers: { authorization: `Bearer ${world.sessionToken}` },
  });
  expect(response.status).toBe(200);
  const body = (await response.json()) as { result: { data: { user: { role: string } } } };
  expect(body.result.data.user.role).toBe(role);
});

Then('the member directory lists names without emails', async ({ world }) => {
  const response = await fetch(`${API_URL}/api/trpc/users.directory`, {
    headers: { authorization: `Bearer ${world.sessionToken}` },
  });
  expect(response.status).toBe(200);
  const body = (await response.json()) as {
    result: { data: Array<Record<string, unknown>> };
  };
  expect(body.result.data.length).toBeGreaterThan(0);
  for (const member of body.result.data) {
    expect(typeof member.name).toBe('string');
    expect(member).not.toHaveProperty('email');
  }
});

Given('another member exists with role {string}', async ({ world }, role: string) => {
  const { token } = seed<{ token: string }>('session', role);
  const response = await fetch(`${API_URL}/api/trpc/auth.me`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const body = (await response.json()) as { result: { data: { user: { id: string } } } };
  world.memberId = body.result.data.user.id;
});

When(
  'the admin renames that member to {string} with role {string}',
  async ({ world }, name: string, role: string) => {
    const response = await call('users.update', world.sessionToken!, {
      id: world.memberId,
      data: { name, role },
    });
    expect(response.status).toBe(200);
  },
);

Then(
  'the member appears as {string} with role {string}',
  async ({ world }, name: string, role: string) => {
    const input = encodeURIComponent(JSON.stringify({ id: world.memberId }));
    const response = await fetch(`${API_URL}/api/trpc/users.get?input=${input}`, {
      headers: { authorization: `Bearer ${world.sessionToken}` },
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      result: { data: { name: string; role: string } };
    };
    expect(body.result.data.name).toBe(name);
    expect(body.result.data.role).toBe(role);
  },
);
