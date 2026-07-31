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
  // tâche, aux horaires ISO LEGACY (review PR #4, décision Quentin 29/07) —
  // deploy à 00:30 PUIS sync à 05:30, comme en prod aujourd'hui : le contenu
  // APIDAE du jour n'est visible qu'au build du lendemain, comportement connu
  // des clients, reproduit tel quel. Heure LOCALE du serveur.
  experimental: { tasks: true },
  scheduledTasks: {
    '30 0 * * *': ['deploy'],
    // Avant le sync et le build : l'assainissement passe sur ce que la
    // resynchronisation nocturne vient de réinstaller. TEMPORAIRE — meurt avec
    // le legacy (voir `tasks/sanitize/media.ts`).
    '0 4 * * *': ['sanitize:media'],
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
