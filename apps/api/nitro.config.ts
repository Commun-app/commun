import { resolve } from 'node:path';
import { defineConfig } from 'nitro/config';

// Le worker de dev bundle les sources du core : le dossier de migrations
// Drizzle n'y est pas résoluble relativement — on le fixe ici (ce fichier,
// lui, s'exécute depuis apps/api). Surchargable par l'env (Docker, e2e).
// Remplace l'ancien scripts/dev.sh (décision 28/07).
process.env.COMMUN_MIGRATIONS_DIR ??= resolve(import.meta.dirname, '../../packages/core/drizzle');

export default defineConfig({
  serverDir: 'server',
  compatibilityDate: '2026-05-19',
  // Tâches portées du legacy (change port-legacy-jobs) : une entrée cron par
  // tâche (review PR #4). L'ordre sync PUIS deploy est garanti par la marge
  // de 30 min (la sync d'ot-pertuis se compte en minutes) — le legacy
  // déployait AVANT la sync. Heure LOCALE du serveur, plage creuse.
  experimental: { tasks: true },
  scheduledTasks: {
    '0 5 * * *': ['apidae:sync'],
    '30 5 * * *': ['deploy'],
  },
  runtimeConfig: {
    // Instance data directory (overridable via COMMUN_DATA_DIR).
    communDataDir: process.env.COMMUN_DATA_DIR ?? '',
  },
  devServer: {
    hostname: '127.0.0.1',
    port: 3001,
  },
});
