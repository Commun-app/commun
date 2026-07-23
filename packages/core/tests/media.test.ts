import { beforeAll, afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { connectDb } from '../src/infrastructure/db/index.ts';
import { createLocalStorage } from '../src/infrastructure/storage/index.ts';
import { MediaRepository } from '../src/domains/media/repository.ts';
import { MediaService } from '../src/domains/media/service.ts';
import { CommunError } from '../src/common/errors/index.ts';

let dataDir: string;
let media: MediaService;
let repository: MediaRepository;

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'commun-media-test-'));
  const db = connectDb(dataDir);
  repository = new MediaRepository(db);
  media = new MediaService(repository, createLocalStorage(dataDir));
});

afterAll(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

const makePng = () =>
  sharp({ create: { width: 600, height: 400, channels: 3, background: '#3366ff' } })
    .png()
    .toBuffer();

describe('local storage driver', () => {
  test('put/get/remove round-trip and traversal rejection', async () => {
    const driver = createLocalStorage(dataDir);
    const data = new TextEncoder().encode('hello');
    await driver.put('abc/test.txt', data, 'text/plain');
    expect(await driver.get('abc/test.txt')).toEqual(data);
    expect(await driver.url('abc/test.txt')).toBe('/api/media/file/abc/test.txt');

    await driver.remove(['abc/test.txt']);
    expect(await driver.get('abc/test.txt')).toBeNull();

    await expect(driver.put('../escape.txt', data, 'text/plain')).rejects.toThrow(
      'clé de stockage invalide',
    );
  });
});

describe('MediaService', () => {
  test('valid image upload → row + original + webp variants; removal deletes all', async () => {
    const bytes = new Uint8Array(await makePng());
    const row = await media.upload({ filename: 'photo mairie.png', mime: 'image/png', bytes });
    expect(row.driver).toBe('local');
    expect(row.filename).toBe('photo_mairie.png');

    const objects = row.objects as { original: string };
    expect(await media.readObject(objects.original)).not.toBeNull();
    expect(await media.url(row.id)).toContain('/api/media/file/');

    await media.generateImageVariants(row.id, bytes);
    const fresh = repository.findById(row.id)!;
    const variants = (fresh.objects as { variants: Record<string, string> }).variants;
    expect(Object.keys(variants).sort()).toEqual(['w1280', 'w320', 'w768']);
    expect(await media.readObject(variants.w320!)).not.toBeNull();

    await media.remove(row.id);
    expect(await media.readObject(objects.original)).toBeNull();
    expect(await media.readObject(variants.w320!)).toBeNull();
  });

  test('rejects a disallowed mime type and an empty payload', async () => {
    await expect(
      media.upload({ filename: 'evil.exe', mime: 'application/x-msdownload', bytes: new Uint8Array([1]) }),
    ).rejects.toThrow(CommunError);
    await expect(
      media.upload({ filename: 'empty.png', mime: 'image/png', bytes: new Uint8Array() }),
    ).rejects.toThrow(CommunError);
  });
});
