import { resolve } from 'node:path';
import { defineConfig } from 'nitro/config';

// The dev worker bundles the core sources, so the Drizzle migrations folder is
// not resolvable relatively from there — pin it here, where the path is known.
process.env.COMMUN_MIGRATIONS_DIR ??= resolve(import.meta.dirname, '../../packages/core/drizzle');

export default defineConfig({
  serverDir: 'server',
  compatibilityDate: '2026-05-19',
  // Tâches portées du legacy (change port-legacy-jobs) : une entrée cron par
  // tâche, aux horaires ISO LEGACY (review PR #4, décision Quentin 29/07) —
  // deploy à 00:30 PUIS sync à 05:30, comme en prod aujourd'hui : le contenu
  // APIDAE du jour n'est visible qu'au build du lendemain, comportement connu
  // des clients, reproduit tel quel. Heure LOCALE du serveur.
  experimental: { tasks: true },
  scheduledTasks: {
    '30 0 * * *': ['deploy'],

    '30 5 * * *': ['apidae:sync'],
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
