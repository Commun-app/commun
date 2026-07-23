import { homedir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';

// Every variable is prefixed COMMUN_ on purpose: the app reads the process
// environment of whatever host runs it (docker-compose, systemd, CI, a shared
// shell) — a namespace avoids collisions with generic names (PORT, DATA_DIR…)
// set by other tools, and makes `env | grep COMMUN_` the whole story.
const envSchema = z.object({
  /** Root data directory of the instance (SQLite database, local media). */
  COMMUN_DATA_DIR: z.string().default(join(homedir(), '.commun')),
  /** Override of the Drizzle migrations folder (set in the Docker image and dev script). */
  COMMUN_MIGRATIONS_DIR: z.string().optional(),
  /**
   * Origins allowed to call the API cross-origin WITH credentials. Only needed
   * when the admin is not served from the same origin as the API.
   */
  COMMUN_ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://127.0.0.1:3000')
    .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean)),
  // S3-compatible media storage — bucket + both keys set → s3 driver, otherwise local disk.
  COMMUN_S3_ENDPOINT: z.string().optional(),
  COMMUN_S3_REGION: z.string().default('fr-par'),
  COMMUN_S3_BUCKET: z.string().optional(),
  COMMUN_S3_ACCESS_KEY: z.string().optional(),
  COMMUN_S3_SECRET_KEY: z.string().optional(),
});

export type CoreEnv = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables at the app boundary.
 * Call once at startup — the result flows through DI, nothing reads process.env after this.
 */
export function parseEnv(raw: Record<string, string | undefined> = process.env): CoreEnv {
  return envSchema.parse({
    COMMUN_DATA_DIR: raw.COMMUN_DATA_DIR,
    COMMUN_MIGRATIONS_DIR: raw.COMMUN_MIGRATIONS_DIR,
    COMMUN_ALLOWED_ORIGINS: raw.COMMUN_ALLOWED_ORIGINS,
    COMMUN_S3_ENDPOINT: raw.COMMUN_S3_ENDPOINT,
    COMMUN_S3_REGION: raw.COMMUN_S3_REGION,
    COMMUN_S3_BUCKET: raw.COMMUN_S3_BUCKET,
    COMMUN_S3_ACCESS_KEY: raw.COMMUN_S3_ACCESS_KEY,
    COMMUN_S3_SECRET_KEY: raw.COMMUN_S3_SECRET_KEY,
  });
}
