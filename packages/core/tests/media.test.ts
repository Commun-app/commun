import { beforeAll, afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connectDb } from '../src/infrastructure/db/index.ts';
import { MediaRepository } from '../src/domains/media/repository.ts';
import { MediaService } from '../src/domains/media/service.ts';
import { CommunError } from '../src/common/errors/index.ts';
import { createFakeStorage } from './helpers/storage.ts';

let dataDir: string;
let media: MediaService;
let storage: ReturnType<typeof createFakeStorage>;

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'commun-media-test-'));
  storage = createFakeStorage();
  media = new MediaService(new MediaRepository(connectDb(dataDir)), storage);
});

afterAll(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

describe('MediaService — iso legacy presigned flow', () => {
  test('requestUpload → direct PUT → finalize records the row; remove deletes the objects', async () => {
    const { key, url } = await media.requestUpload('photo mairie.png', 'image/png');
    expect(url).toContain('/put/');
    expect(key.endsWith('/photo_mairie.png')).toBe(true);

    const row = await media.finalize({ key, filename: 'photo mairie.png', mime: 'image/png' });
    expect(row.driver).toBe('s3');
    expect(row.size).toBe(1234);
    expect(await media.url(row.id)).toContain('?signed');

    await media.remove(row.id);
    expect(storage.objects.has(key)).toBe(false);
    expect(await media.url(row.id)).toBeNull();
  });

  test('rejects a disallowed mime type at requestUpload', async () => {
    await expect(media.requestUpload('evil.exe', 'application/x-msdownload')).rejects.toThrow(
      CommunError,
    );
  });

  test('finalize refuses a key that was never uploaded', async () => {
    await expect(
      media.finalize({ key: 'nope/missing.png', filename: 'missing.png', mime: 'image/png' }),
    ).rejects.toThrow('objet non trouvé');
  });
});
