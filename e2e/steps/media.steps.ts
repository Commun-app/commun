import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures.ts';
import { seed } from './instance.ts';
import { trpcMutate, trpcQuery } from '../clients/client-trpc.ts';

const { Given, When, Then } = createBdd(test);

const mutate = (procedure: string, token: string, input: unknown) =>
  trpcMutate(procedure, { input, token });
const query = (procedure: string, token: string, input?: unknown) =>
  trpcQuery(procedure, { input, token });

// Octets envoyés au bucket puis relus via l'URL signée (comparaison exacte).
const FILE_BYTES = new TextEncoder().encode('e2e-jpeg-bytes-ÿØÿ');

// Portés entre steps du même scénario (séquentiels au sein d'une feature).
let presignedUrl = '';
let uploadKey = '';

Given('the S3 bucket is provisioned', () => {
  seed('bucket');
});

// ── Presign ──────────────────────────────────────────────────────────────────

When(
  'the user requests an upload URL for {string} of type {string}',
  async ({ world }, filename: string, mime: string) => {
    const response = await mutate('media.requestUpload', world.sessionToken!, { filename, mime });
    world.status = response.status;
    world.body = response.body;
  },
);

Then('a signed S3 upload URL is delivered', ({ world }) => {
  expect(world.status).toBe(200);
  const body = world.body as { result: { data: { key: string; url: string } } };
  expect(body.result.data.key.length).toBeGreaterThan(5);
  expect(body.result.data.url).toContain('X-Amz-Signature');
  presignedUrl = body.result.data.url;
  uploadKey = body.result.data.key;
});

// ── Aller-retour S3 réel ─────────────────────────────────────────────────────

When('the file bytes are uploaded to the presigned URL', async () => {
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'content-type': 'image/jpeg' },
    body: FILE_BYTES,
  });
  expect(response.status).toBe(200);
});

When('the upload is finalized', async ({ world }) => {
  const response = await mutate('media.finalize', world.sessionToken!, {
    key: uploadKey,
    filename: 'affiche.jpg',
    mime: 'image/jpeg',
  });
  expect(response.status).toBe(200);
  world.mediaId = (response.body as { result: { data: { id: string } } }).result.data.id;
});

Then('the media library lists it with public object URLs', async ({ world }) => {
  const response = await query('media.list', world.sessionToken!);
  expect(response.status).toBe(200);
  const body = response.body as {
    result: { data: Array<{ id: string; objects: Record<string, string> }> };
  };
  const media = body.result.data.find((row) => row.id === world.mediaId)!;
  expect(media).toBeTruthy();
  // Ni signature ni péremption : c'est tout l'objet du changement. L'URL est
  // l'adresse directe de l'objet, sous le préfixe servi publiquement.
  expect(media.objects.original).not.toContain('X-Amz-Signature');
  expect(media.objects.original).not.toContain('X-Amz-Expires');
  expect(media.objects.original).toContain(uploadKey);
});

Then(
  'downloading the original URL without credentials returns the uploaded bytes',
  async ({ world }) => {
    const media = await (async () => {
      const response = await query('media.get', world.sessionToken!, { id: world.mediaId });
      expect(response.status).toBe(200);
      return (response.body as { result: { data: { objects: { original: string } } } }).result.data;
    })();
    const download = await fetch(media.objects.original);
    expect(download.status).toBe(200);
    expect(new Uint8Array(await download.arrayBuffer())).toEqual(FILE_BYTES);
  },
);

// ── Métadonnées & suppression ────────────────────────────────────────────────

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
  expect((response.body as { result: { data: { alt: string } } }).result.data.alt).toBe(alt);
});

When('the media is removed', async ({ world }) => {
  const response = await mutate('media.remove', world.sessionToken!, { id: world.mediaId });
  expect(response.status).toBe(200);
});

Then('the media library no longer lists it', async ({ world }) => {
  const response = await query('media.list', world.sessionToken!);
  const body = response.body as { result: { data: Array<{ id: string }> } };
  expect(body.result.data.some((row) => row.id === world.mediaId)).toBe(false);
});
