import { beforeAll, afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import { connectDb, type StoreDb } from '../src/infrastructure/db/index.ts';
import { media } from '../src/domains/media/schema.ts';
import { createLocalStorage } from '../src/infrastructure/storage/index.ts';
import {
  generateImageVariants,
  removeMedia,
  uploadMedia,
} from '../src/domains/media/service.ts';
import { CommunError } from '../src/common/errors/index.ts';

let dataDir: string;
let db: StoreDb;
const storage = () => createLocalStorage(dataDir);

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'commun-media-test-'));
  db = connectDb(dataDir);
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
    const driver = storage();
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

describe('media service', () => {
  test('valid image upload → row + original + webp variants; removal deletes all', async () => {
    const driver = storage();
    const bytes = new Uint8Array(await makePng());
    const row = await uploadMedia(db, driver, { filename: 'photo mairie.png', mime: 'image/png', bytes });
    expect(row.driver).toBe('local');
    expect(row.filename).toBe('photo_mairie.png');

    const objects = row.objects as { original: string };
    expect(await driver.get(objects.original)).not.toBeNull();

    await generateImageVariants(db, driver, row.id, bytes);
    const fresh = db.select().from(media).where(eq(media.id, row.id)).get()!;
    const variants = (fresh.objects as { variants: Record<string, string> }).variants;
    expect(Object.keys(variants).sort()).toEqual(['w1280', 'w320', 'w768']);
    expect(await driver.get(variants.w320!)).not.toBeNull();

    await removeMedia(db, driver, row.id);
    expect(await driver.get(objects.original)).toBeNull();
    expect(await driver.get(variants.w320!)).toBeNull();
  });

  test('rejects a disallowed mime type and an empty payload', async () => {
    const driver = storage();
    await expect(
      uploadMedia(db, driver, {
        filename: 'evil.exe',
        mime: 'application/x-msdownload',
        bytes: new Uint8Array([1]),
      }),
    ).rejects.toThrow(CommunError);
    await expect(
      uploadMedia(db, driver, { filename: 'empty.png', mime: 'image/png', bytes: new Uint8Array() }),
    ).rejects.toThrow(CommunError);
  });
});
