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
  // Tâches portées du legacy (change port-legacy-jobs) : sync APIDAE puis
  // deploy, une fois par jour. Le cron suit l'heure LOCALE du serveur —
  // 05:00, heure creuse (le legacy synchronisait à 05:30 UTC).
  experimental: { tasks: true },
  scheduledTasks: {
    '0 5 * * *': ['jobs:daily'],
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
