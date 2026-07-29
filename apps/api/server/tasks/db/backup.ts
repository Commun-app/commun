import { Database } from 'bun:sqlite';
import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineTask } from 'nitro/task';
import { useCore } from '../../utils/core.ts';

// Rétention des snapshots quotidiens (spec self-hosting, silent-migration).
const RETENTION_DAYS = 30;
const PREFIX = 'backups/';

/**
 * Sauvegarde quotidienne de la base SQLite vers le S3 de l'instance :
 * snapshot COHÉRENT à chaud (`VACUUM INTO` depuis une connexion lecture —
 * jamais une copie brute du fichier ouvert en WAL), poussé sous
 * `backups/<date>.db` via le driver de stockage, puis purge au-delà de la
 * rétention. Profite aussi au self-hosting open source.
 */
export default defineTask({
  meta: {
    name: 'db:backup',
    description: 'Snapshot SQLite quotidien vers le bucket S3 (rétention 30 j)',
  },
  async run() {
    const core = useCore();
    const date = new Date().toISOString().slice(0, 10);
    const key = `${PREFIX}${date}.db`;
    const snapshotPath = join(tmpdir(), `commun-backup-${date}-${process.pid}.db`);

    const source = new Database(join(core.env.COMMUN_DATA_DIR, 'commun.db'), { readonly: true });
    try {
      source.exec(`VACUUM INTO '${snapshotPath.replaceAll("'", "''")}'`);
    } finally {
      source.close();
    }

    try {
      const body = new Uint8Array(await readFile(snapshotPath));
      await core.storage.put(key, body, 'application/octet-stream');

      const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 3600 * 1000)
        .toISOString()
        .slice(0, 10);
      const expired = (await core.storage.list(PREFIX)).filter((existing) => {
        const day = existing.slice(PREFIX.length, PREFIX.length + 10);
        return /^\d{4}-\d{2}-\d{2}$/.test(day) && day < cutoff;
      });
      await core.storage.remove(expired);

      return { result: { key, size: body.byteLength, purged: expired.length } };
    } finally {
      await rm(snapshotPath, { force: true });
    }
  },
});
