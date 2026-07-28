import { defineTask, runTask } from 'nitro/task';

/**
 * Passe quotidienne : sync APIDAE PUIS deploy (l'ordre legacy était inversé —
 * deploy 00:30, sync 05:30). Le deploy s'exécute même si la sync échoue : les
 * modifications éditoriales de la veille doivent partir même si APIDAE est en
 * panne.
 */
export default defineTask({
  meta: {
    name: 'jobs:daily',
    description: 'Sync APIDAE puis déploiement du site',
  },
  async run() {
    let sync: unknown;
    let syncError: string | undefined;
    try {
      sync = await runTask('apidae:sync');
    } catch (error) {
      syncError = error instanceof Error ? error.message : String(error);
      console.error('[jobs:daily] sync APIDAE en échec — le deploy part quand même', error);
    }
    const deploy = await runTask('deploy');
    return { result: { sync: sync ?? { error: syncError }, deploy } };
  },
});
