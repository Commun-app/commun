import { depsFromCore, runApidaeSync, type ApidaeSyncReport } from '@commun/apidae-sync';
import { defineTask } from 'nitro/task';
import { useCore } from '../../utils/core.ts';

/**
 * APIDAE sync. Pipelines are read from the organization settings and written
 * through the core services; the engine itself lives in @commun/apidae-sync.
 */
export default defineTask({
  meta: {
    name: 'apidae:sync',
    description: 'Sync APIDAE tourism objects into their collections',
  },
  async run(): Promise<{ result: ApidaeSyncReport }> {
    const core = useCore();
    const report = await runApidaeSync(depsFromCore(core), {
      // APIDAE base URL override, for the E2E mock and sandboxes.
      apidaeBaseUrl: core.env.COMMUN_APIDAE_API_URL || undefined,
    });
    return { result: report };
  },
});
