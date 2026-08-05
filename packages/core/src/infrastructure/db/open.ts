import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import * as schema from './schema.ts';

// Relative to this file. Bundled deployments break that path, and pass an
// explicit folder through COMMUN_MIGRATIONS_DIR instead.
const DEFAULT_MIGRATIONS_FOLDER = join(import.meta.dir, '..', '..', '..', 'drizzle');

/** Open and migrate the instance database: one instance, one SQLite file. */
export function connectDb(dataDir: string, migrationsDir?: string) {
  const migrationsFolder = migrationsDir ?? DEFAULT_MIGRATIONS_FOLDER;
  mkdirSync(dataDir, { recursive: true });

  const client = new Database(join(dataDir, 'commun.db'));
  client.exec('PRAGMA journal_mode=WAL');
  // Off by default in SQLite — required for the schema's cascades and referential integrity.
  client.exec('PRAGMA foreign_keys=ON');
  // A concurrent writer (CLI, seed script, backup) waits instead of failing.
  client.exec('PRAGMA busy_timeout=5000');

  const db = drizzle({ client, schema });
  // The migrations folder appears with the first drizzle-kit generation.
  if (existsSync(join(migrationsFolder, 'meta', '_journal.json'))) {
    migrate(db, { migrationsFolder });
  }

  return db;
}

/** The fully-typed Drizzle instance returned by `connectDb`. */
export type StoreDb = ReturnType<typeof connectDb>;
