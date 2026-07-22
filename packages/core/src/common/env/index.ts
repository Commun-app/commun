import { homedir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';

const envSchema = z.object({
  /** Root data directory of the instance (SQLite database, local media). */
  COMMUN_DATA_DIR: z.string().default(join(homedir(), '.commun')),
});

export type CoreEnv = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables at the app boundary.
 * Call once at startup — the result flows through DI, nothing reads process.env after this.
 */
export function parseEnv(raw: Record<string, string | undefined> = process.env): CoreEnv {
  return envSchema.parse({
    COMMUN_DATA_DIR: raw.COMMUN_DATA_DIR,
  });
}
