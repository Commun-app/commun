import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures.ts';
import { API_URL, seed } from './instance.ts';

const { Given, When, Then } = createBdd(test);

const mutate = (procedure: string, token: string, input: unknown) =>
  fetch(`${API_URL}/api/trpc/${procedure}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });

const query = (procedure: string, token: string, input?: unknown) =>
  fetch(
    `${API_URL}/api/trpc/${procedure}${input ? `?input=${encodeURIComponent(JSON.stringify(input))}` : ''}`,
    { headers: { authorization: `Bearer ${token}` } },
  );

// ── Presign (partagé avec infrastructure.feature) ────────────────────────────

When(
  'the user requests an upload URL for {string} of type {string}',
  async ({ world }, filename: string, mime: string) => {
    const response = await mutate('media.requestUpload', world.sessionToken!, { filename, mime });
    world.status = response.status;
    world.body = await response.json();
  },
);

Then('a signed S3 upload URL is delivered', ({ world }) => {
  expect(world.status).toBe(200);
  const body = world.body as { result: { data: { key: string; url: string } } };
  expect(body.result.data.key.length).toBeGreaterThan(5);
  expect(body.result.data.url).toContain('X-Amz-Signature');
});

Then('the upload request is rejected', ({ world }) => {
  expect(world.status).toBe(400);
});

// ── Bibliothèque (ligne seedée — les opérations S3 réelles attendent MinIO) ──

Given('a stored media {string}', ({ world }, filename: string) => {
  world.mediaId = seed<{ id: string }>('media', filename).id;
});

Then('the media library lists it with signed object URLs', async ({ world }) => {
  const response = await query('media.list', world.sessionToken!);
  expect(response.status).toBe(200);
  const body = (await response.json()) as {
    result: { data: Array<{ id: string; objects: Record<string, string> }> };
  };
  const media = body.result.data.find((row) => row.id === world.mediaId)!;
  expect(media).toBeTruthy();
  expect(media.objects.original).toContain('X-Amz-Signature');
});

When('the media alt text is updated to {string}', async ({ world }, alt: string) => {
  const response = await mutate('media.update', world.sessionToken!, {
    id: world.mediaId,
    data: { alt },
  });
  expect(response.status).toBe(200);
});

Then('the media alt text reads {string}', async ({ world }, alt: string) => {
  const response = await query('media.get', world.sessionToken!, { id: world.mediaId });
  expect(response.status).toBe(200);
  const body = (await response.json()) as { result: { data: { alt: string } } };
  expect(body.result.data.alt).toBe(alt);
});
