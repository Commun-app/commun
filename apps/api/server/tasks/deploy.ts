import { defineTask } from 'nitro/task';
import { DeployHookMissingError } from '@commun/core';
import { useCore } from '../utils/core.ts';

/**
 * Triggers the site build. A failure surfaces as a task error — the legacy job
 * swallowed it and always reported success. A missing hook is an explicit no-op.
 */
export default defineTask({
  meta: {
    name: 'deploy',
    description: 'Trigger the site build through the configured deploy hook',
  },
  async run(): Promise<{ result: { triggered: boolean; status?: number; reason?: string } }> {
    const { services } = useCore();
    try {
      const { status } = await services.organization.deploy();
      return { result: { triggered: true, status } };
    } catch (error) {
      if (error instanceof DeployHookMissingError) {
        return { result: { triggered: false, reason: 'no deploy hook configured' } };
      }
      throw error;
    }
  },
});
