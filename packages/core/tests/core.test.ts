import { describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCore, parseEnv } from '../src/index.ts';

describe('createCore', () => {
  test('boots against a fresh data dir and reports a healthy database', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'commun-core-test-'));
    try {
      const core = createCore({ env: parseEnv({ COMMUN_DATA_DIR: dataDir }) });
      const health = await core.services.health.check();
      expect(health.status).toBe('ok');
      expect(health.service).toBe('@commun/core');
      expect(health.db.ok).toBe(true);
      expect(core.storage.kind).toBe('unconfigured');
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });
});
