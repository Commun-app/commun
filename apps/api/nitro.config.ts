import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'nitro/config';

// Charge le .env RACINE du monorepo : `bun run` le charge pour ses scripts,
// mais le dev worker de nitro (env-runner) ne reçoit que l'env muté ICI —
// dans le process de config. Les variables déjà présentes priment.
const rootEnv = resolve(import.meta.dirname, '../../.env');
if (existsSync(rootEnv)) {
  for (const line of readFileSync(rootEnv, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match?.[1] && match[2] !== undefined && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2];
    }
  }
}

// Le worker de dev bundle les sources du core : le dossier de migrations
// Drizzle n'y est pas résoluble relativement — on le fixe ici (ce fichier,
// lui, s'exécute depuis apps/api). Surchargable par l'env (Docker, e2e).
// Remplace l'ancien scripts/dev.sh (décision 28/07).
process.env.COMMUN_MIGRATIONS_DIR ??= resolve(import.meta.dirname, '../../packages/core/drizzle');

export default defineConfig({
  serverDir: 'server',
  compatibilityDate: '2026-05-19',
  runtimeConfig: {
    // Instance data directory (overridable via COMMUN_DATA_DIR).
    communDataDir: process.env.COMMUN_DATA_DIR ?? '',
  },
  devServer: {
    hostname: '127.0.0.1',
    port: 3001,
  },
});
