import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

// The API under test (Playwright's webServer boots it on the dedicated port).
export const API_URL = process.env.E2E_API_URL ?? 'http://127.0.0.1:3101';

/**
 * Seed state in the database of the API under test. The Playwright workers
 * run under Node, but @commun/core needs bun:sqlite — so seeding shells out
 * to `e2e/setup/seed.ts` executed by Bun (same COMMUN_DATA_DIR as the
 * webServer). Returns the parsed JSON the script prints.
 */
export function seed<T = Record<string, string>>(command: string, argument?: string): T {
  const script = join(__dirname, '..', 'setup', 'seed.ts');
  const stdout = execFileSync('bun', [script, command, ...(argument ? [argument] : [])], {
    encoding: 'utf8',
  });
  return JSON.parse(stdout.trim().split('\n').at(-1)!) as T;
}
