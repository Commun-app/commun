import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import * as schema from './schema.ts';

// packages/core/drizzle/ — relative to this file at src/infrastructure/db/
const MIGRATIONS_FOLDER = join(import.meta.dir, '..', '..', '..', 'drizzle');

/**
 * Open (and migrate) the single-tenant instance database at
 * `<dataDir>/commun.db`. One instance = one collectivité = one SQLite file.
 */
export function connectDb(dataDir: string) {
  mkdirSync(dataDir, { recursive: true });

  const client = new Database(join(dataDir, 'commun.db'));
  client.exec('PRAGMA journal_mode=WAL');
  // Off by default in SQLite — required for the schema's cascades and referential integrity.
  client.exec('PRAGMA foreign_keys=ON');

  const db = drizzle({ client, schema });
  // The migrations folder appears with the first drizzle-kit generation.
  if (existsSync(join(MIGRATIONS_FOLDER, 'meta', '_journal.json'))) {
    migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  }

  return db;
}

/** The fully-typed Drizzle instance returned by `connectDb`. */
export type StoreDb = ReturnType<typeof connectDb>;
