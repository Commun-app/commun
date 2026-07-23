import { homedir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';

const envSchema = z.object({
  /** Root data directory of the instance (SQLite database, local media). */
  COMMUN_DATA_DIR: z.string().default(join(homedir(), '.commun')),
  /** Override of the Drizzle migrations folder (set in the Docker image). */
  COMMUN_MIGRATIONS_DIR: z.string().optional(),
  /** First-boot admin bootstrap: an invitation link is logged for this email. */
  COMMUN_ADMIN_EMAIL: z.string().optional(),
  // S3-compatible media storage — all four set → s3 driver, otherwise local disk.
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
    COMMUN_ADMIN_EMAIL: raw.COMMUN_ADMIN_EMAIL,
    COMMUN_S3_ENDPOINT: raw.COMMUN_S3_ENDPOINT,
    COMMUN_S3_REGION: raw.COMMUN_S3_REGION,
    COMMUN_S3_BUCKET: raw.COMMUN_S3_BUCKET,
    COMMUN_S3_ACCESS_KEY: raw.COMMUN_S3_ACCESS_KEY,
    COMMUN_S3_SECRET_KEY: raw.COMMUN_S3_SECRET_KEY,
  });
}
