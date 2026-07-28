import { runApidaeSync } from './injector.ts';
import type { ApidaeSyncDeps, ApidaeSyncOptions, ApidaeSyncReport } from './injector.ts';

/** Façade service de la sync APIDAE — consommée par la tâche Nitro `apidae:sync`. */
export class SyncService {
  constructor(private readonly deps: ApidaeSyncDeps) {}

  run(options?: ApidaeSyncOptions): Promise<ApidaeSyncReport> {
    return runApidaeSync(this.deps, options);
  }
}
