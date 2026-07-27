import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// The API under test (Playwright's webServer boots it on the dedicated port).
export const API_URL = process.env.E2E_API_URL ?? 'http://127.0.0.1:3101';

// MUST mirror the COMMUN_DATA_DIR of playwright.config.ts's webServer command
// ("${TMPDIR:-/tmp}/commun-e2e-data" — Node's tmpdir() resolves to $TMPDIR).
const E2E_DATA_DIR = join(tmpdir(), 'commun-e2e-data');

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
