import { homedir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from 'drizzle-kit';

// dbCredentials : uniquement pour `drizzle-kit studio` (inspection visuelle
// de la base) — generate n'en a pas besoin. Pointez COMMUN_DATA_DIR sur la
// base à inspecter (ex : .dump/smoke-grigny).
const dataDir = process.env.COMMUN_DATA_DIR ?? join(homedir(), '.commun');

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/infrastructure/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: join(dataDir, 'commun.db') },
});
