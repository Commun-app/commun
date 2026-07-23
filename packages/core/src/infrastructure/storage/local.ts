import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import type { StorageDriver } from './types.ts';

/** Keys are relative paths — refuse anything that could escape the media root. */
function safePath(baseDir: string, key: string): string {
  const path = normalize(join(baseDir, key));
  if (!path.startsWith(baseDir)) throw new Error(`clé de stockage invalide: ${key}`);
  return path;
}

export function createLocalStorage(dataDir: string): StorageDriver {
  const baseDir = join(dataDir, 'media');
  return {
    kind: 'local',
    async put(key, data) {
      const path = safePath(baseDir, key);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, data);
    },
    async get(key) {
      try {
        return new Uint8Array(await readFile(safePath(baseDir, key)));
      } catch {
        return null;
      }
    },
    async remove(keys) {
      await Promise.all(keys.map((key) => rm(safePath(baseDir, key), { force: true })));
    },
    // Served by the API itself: GET /api/media/file/<key>.
    url: async (key) => `/api/media/file/${key}`,
  };
}
