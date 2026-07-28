import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { DEFAULT_PASSWORD } from '../constants.ts';
import { test } from './fixtures.ts';
import { API_URL, seed } from './instance.ts';
import { emailCount, lastEmail, startEmailReceiver } from '../mocks/email-webhook.mock.ts';
import { dataOf, trpcMutate, trpcQuery } from './trpc.ts';

const { Given, When, Then } = createBdd(test);

const callMe = (token?: string) => trpcQuery('auth.me', { token });

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
  const response = await trpcMutate('auth.acceptInvitation', {
    input: {
      token: world.inviteToken,
      name: 'E2E Admin',
      password: DEFAULT_PASSWORD,
    },
  });
  expect(response.status).toBe(200);
  world.body = response.body;
});

When('logs in with those credentials', async ({ world }) => {
  const body = world.body as { result: { data: { user: { email: string } } } };
  const response = await trpcMutate('auth.login', {
    input: { email: body.result.data.user.email, password: DEFAULT_PASSWORD },
  });
  expect(response.status).toBe(200);
  world.sessionToken = (response.body as { result: { data: { token: string } } }).result.data.token;
});

Then('a session token is returned', ({ world }) => {
  expect(world.sessionToken).toBeTruthy();
});

Then('the me procedure returns the {string} account', async ({ world }, email: string) => {
  const result = await callMe(world.sessionToken);
  expect(result.status).toBe(200);
  expect(JSON.stringify(result.body)).toContain(email);
});

When('the user logs out', async ({ world }) => {
  const response = await trpcMutate('auth.logout', { input: {}, token: world.sessionToken });
  expect(response.status).toBe(200);
});

Then('the me procedure refuses the revoked token', async ({ world }) => {
  const result = await callMe(world.sessionToken);
  expect(result.status).toBe(401);
});

// ── Mot de passe oublié (webhook email) ──────────────────────────────────────

let emailCountBefore = 0;

Given(
  'an activated account {string} named {string}',
  async ({ world }, email: string, name: string) => {
    const { token } = seed<{ token: string }>('invitation', email);
    const response = await trpcMutate('auth.acceptInvitation', {
      input: { token, name, password: DEFAULT_PASSWORD },
    });
    expect(response.status).toBe(200);
    world.accountEmail = email;
  },
);

When('a password reset is requested for {string}', async ({ world }, email: string) => {
  await startEmailReceiver();
  emailCountBefore = emailCount();
  const response = await trpcMutate('auth.requestPasswordReset', { input: { email } });
  world.status = response.status;
});

Then(
  'a {string} event is emitted through the authenticated webhook',
  ({ world }, eventName: string) => {
    expect(world.status).toBe(200);
    const event = lastEmail()!;
    expect(emailCount()).toBe(emailCountBefore + 1);
    expect(event.eventName).toBe(eventName);
    expect(event.authValid).toBe(true); // Authorization: Bearer <token>
    world.resetUrl = event.eventProperties.url;
  },
);

When(
  'the reset link is consumed with the new password {string}',
  async ({ world }, password: string) => {
    const token = world.resetUrl!.split('/password/define/')[1]!;
    // Sans nom : conservé côté serveur (flux reset).
    const response = await trpcMutate('auth.acceptInvitation', { input: { token, password } });
    expect(response.status).toBe(200);
  },
);

const tryLogin = (email: string, password: string) =>
  trpcMutate<{ token: string }>('auth.login', { input: { email, password } });

Then(
  'logging in {string} with password {string} succeeds',
  async ({ world }, email: string, password: string) => {
    const result = await tryLogin(email, password);
    expect(result.status).toBe(200);
    world.sessionToken = (result.body as { result: { data: { token: string } } }).result.data.token;
  },
);

Then(
  'logging in {string} with password {string} is refused',
  async ({ world: _world }, email: string, password: string) => {
    expect((await tryLogin(email, password)).status).toBe(401);
  },
);

Then(
  'the account {string} is still named {string}',
  async ({ world }, _email: string, name: string) => {
    const result = await callMe(world.sessionToken);
    expect(result.status).toBe(200);
    expect(
      (result.body as { result: { data: { user: { name: string } } } }).result.data.user.name,
    ).toBe(name);
  },
);

Then('the API answers ok without emitting any email', ({ world }) => {
  expect(world.status).toBe(200); // réponse indiscernable d'un compte existant
  expect(emailCount()).toBe(emailCountBefore);
});

// ── Tokens API ───────────────────────────────────────────────────────────────

When('the admin creates an API token named {string}', async ({ world }, name: string) => {
  const response = await trpcMutate('apiTokens.create', {
    input: { name },
    token: world.sessionToken,
  });
  expect(response.status).toBe(200);
  const created = dataOf(response as never) as { id: string; token: string };
  world.createdApiToken = created.token;
  world.createdApiTokenId = created.id;
});

Then('the content plane accepts the new token', async ({ world }) => {
  const response = await fetch(`${API_URL}/api/v1/content/records`, {
    headers: { authorization: `Bearer ${world.createdApiToken}` },
  });
  expect(response.status).toBe(200);
});

When('the admin revokes that token', async ({ world }) => {
  const response = await trpcMutate('apiTokens.revoke', {
    input: { id: world.createdApiTokenId },
    token: world.sessionToken,
  });
  expect(response.status).toBe(200);
});

Then('the content plane refuses the revoked token', async ({ world }) => {
  const response = await fetch(`${API_URL}/api/v1/content/records`, {
    headers: { authorization: `Bearer ${world.createdApiToken}` },
  });
  expect(response.status).toBe(401);
});

// ── Sessions (liste d'appareils, révocation ciblée) ─────────────────────────

When('the account logs in from two devices', async ({ world }) => {
  const first = await tryLogin(world.accountEmail!, DEFAULT_PASSWORD);
  const second = await tryLogin(world.accountEmail!, DEFAULT_PASSWORD);
  expect(first.status).toBe(200);
  expect(second.status).toBe(200);
  world.secondSessionToken = (
    first.body as { result: { data: { token: string } } }
  ).result.data.token;
  world.sessionToken = (second.body as { result: { data: { token: string } } }).result.data.token;
});

async function listSessions(token: string) {
  const response = await trpcQuery<Array<{ id: string; current: boolean }>>('auth.sessions.list', {
    token,
  });
  expect(response.status).toBe(200);
  return dataOf(response);
}

Then(
  'the session list shows {int} active devices and flags the current one',
  async ({ world }, count: number) => {
    const sessions = await listSessions(world.sessionToken!);
    expect(sessions).toHaveLength(count);
    expect(sessions.filter((session) => session.current)).toHaveLength(1);
  },
);

When('the other device session is revoked', async ({ world }) => {
  const sessions = await listSessions(world.sessionToken!);
  const other = sessions.find((session) => !session.current)!;
  const response = await trpcMutate('auth.sessions.revoke', {
    input: { id: other.id },
    token: world.sessionToken,
  });
  expect(response.status).toBe(200);
});

Then('the session list shows {int} active device', async ({ world }, count: number) => {
  expect(await listSessions(world.sessionToken!)).toHaveLength(count);
});

// ── Invitation expirée ───────────────────────────────────────────────────────

Given('the invitations of {string} are expired', ({ world: _world }, email: string) => {
  seed('expire-invitation', email);
});

Then('accepting that invitation is refused as invalid or expired', async ({ world }) => {
  const response = await trpcMutate('auth.acceptInvitation', {
    input: {
      token: world.inviteToken,
      name: 'Tardif',
      password: 'assez-long-pourtant',
    },
  });
  expect(response.status).toBe(400);
});

// ── Listing des tokens API ───────────────────────────────────────────────────

async function findTokenInList(world: { sessionToken?: string }, name: string) {
  const response = await trpcQuery<Array<{ name: string; revokedAt: string | null }>>(
    'apiTokens.list',
    { token: world.sessionToken },
  );
  expect(response.status).toBe(200);
  return dataOf(response).find((token) => token.name === name);
}

Then('the token list shows {string} as active', async ({ world }, name: string) => {
  const token = await findTokenInList(world, name);
  expect(token).toBeTruthy();
  expect(token!.revokedAt).toBeNull();
});

Then('the token list shows {string} as revoked', async ({ world }, name: string) => {
  const token = await findTokenInList(world, name);
  expect(token).toBeTruthy();
  expect(token!.revokedAt).not.toBeNull();
});
