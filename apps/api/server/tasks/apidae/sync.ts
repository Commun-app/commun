import { depsFromCore, runApidaeSync } from '@commun/apidae-sync';
import { defineTask } from 'nitro/task';
import { useCore } from '../../utils/core.ts';

/**
 * Sync APIDAE (portage APIDAE-only du job-data-sync legacy) : pipelines lus
 * depuis `organization.legacyExtra.injector`, écriture via les services du
 * core. Le moteur vit dans @commun/apidae-sync (frontière volontaire, review
 * PR #4 — candidat à l'extraction hors monorepo en phase 6).
 */
export default defineTask({
  meta: {
    name: 'apidae:sync',
    description: 'Synchronise les objets touristiques APIDAE vers les collections',
  },
  async run() {
    const report = await runApidaeSync(depsFromCore(useCore()), {
      // Surcharge de l'API APIDAE (E2E, bac à sable).
      apidaeBaseUrl: process.env.APIDAE_API_URL || undefined,
    });
    return { result: report };
  },
});
