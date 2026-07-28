import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { E2E_DATA_DIR } from '../constants.ts';

export { API_URL } from '../constants.ts';

/**
 * Seed state in the database of the API under test. The Playwright workers
 * run under Node, but @commun/core needs bun:sqlite — so seeding shells out
 * to `e2e/setup/seed.ts` executed by Bun. The data dir is passed via the
 * dedicated E2E_DATA_DIR variable: Bun auto-loads the repo-root .env, whose
 * COMMUN_DATA_DIR may point at a developer database — the seed must never
 * write anywhere but the throwaway dir of the API under test.
 */
export function seed<T = Record<string, string>>(command: string, argument?: string): T {
  const script = join(__dirname, '..', 'setup', 'seed.ts');
  const stdout = execFileSync('bun', [script, command, ...(argument ? [argument] : [])], {
    encoding: 'utf8',
    env: { ...process.env, E2E_DATA_DIR },
  });
  return JSON.parse(stdout.trim().split('\n').at(-1)!) as T;
}
