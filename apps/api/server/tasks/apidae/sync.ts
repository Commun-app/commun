import { defineTask } from 'nitro/task';
import { useCore } from '../../utils/core.ts';

/**
 * Sync APIDAE (portage APIDAE-only du job-data-sync legacy) : pipelines lus
 * depuis `organization.legacyExtra.injector`, écriture via les services du
 * core. Le rapport détaille compteurs et erreurs par pipeline.
 */
export default defineTask({
  meta: {
    name: 'apidae:sync',
    description: 'Synchronise les objets touristiques APIDAE vers les collections',
  },
  async run() {
    const { services } = useCore();
    const report = await services.sync.run({
      // Surcharge de l'API APIDAE (tests d'intégration, bac à sable).
      apidaeBaseUrl: process.env.APIDAE_API_URL || undefined,
    });
    return { result: report };
  },
});
