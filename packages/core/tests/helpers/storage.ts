import type { StorageDriver } from '../../src/infrastructure/storage/index.ts';

/**
 * In-memory S3 double for tests: `presignedPutUrl` marks the key as uploaded
 * (simulating the client's direct PUT), `head` confirms it, `url` returns a
 * deterministic fake signed URL.
 */
export function createFakeStorage(): StorageDriver & { objects: Set<string> } {
  const objects = new Set<string>();
  return {
    kind: 's3',
    objects,
    async presignedPutUrl(key) {
      objects.add(key);
      return `https://fake-s3.local/put/${key}`;
    },
    async head(key) {
      return objects.has(key) ? { size: 1234 } : null;
    },
    async remove(keys) {
      for (const key of keys) objects.delete(key);
    },
    async url(key) {
      return `https://fake-s3.local/${key}?signed`;
    },
  };
}
