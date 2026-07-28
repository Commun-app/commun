import { defineTask } from 'nitro/task';
import { useCore } from '../utils/core.ts';

/**
 * Déclenche le build du site (GET du hook Vercel). Contrairement au job
 * legacy (erreur avalée, sortie toujours en succès), un échec remonte en
 * erreur de tâche ; l'absence de hook est un no-op explicite.
 */
export default defineTask({
  meta: {
    name: 'deploy',
    description: 'Déclenche le build Vercel du site (hook organization.deployment)',
  },
  async run(): Promise<{ result: { triggered: boolean; status?: number; reason?: string } }> {
    const { services } = useCore();
    try {
      const { status } = await services.organization.deploy();
      return { result: { triggered: true, status } };
    } catch (error) {
      if (error instanceof Error && error.name === 'deploy-hook-missing-error') {
        return { result: { triggered: false, reason: 'aucun hook configuré' } };
      }
      throw error;
    }
  },
});
