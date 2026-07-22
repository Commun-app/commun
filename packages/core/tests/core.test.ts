import { describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCore } from '../src/index.ts';

describe('createCore', () => {
  test('boots against a fresh data dir and reports a healthy database', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'commun-core-test-'));
    try {
      const core = createCore({ env: { COMMUN_DATA_DIR: dataDir } });
      const health = await core.health.check();
      expect(health.ok).toBe(true);
      expect(health.service).toBe('@commun/core');
      expect(health.db.ok).toBe(true);
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });
});
