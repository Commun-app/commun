import { homedir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';

// Every variable is prefixed COMMUN_ on purpose: the app reads the process
// environment of whatever host runs it (docker-compose, systemd, CI, a shared
// shell) — a namespace avoids collisions with generic names (PORT, DATA_DIR…)
// set by other tools, and makes `env | grep COMMUN_` the whole story.
const envSchema = z.object({
  /** Root data directory of the instance (SQLite database). */
  COMMUN_DATA_DIR: z.string().default(join(homedir(), '.commun')),
  /** Override of the Drizzle migrations folder (set in the Docker image and dev script). */
  COMMUN_MIGRATIONS_DIR: z.string().optional(),
  // S3-compatible media storage (iso legacy: S3 is the ONLY media backend) —
  // bucket + both keys set → storage available, otherwise media uploads fail
  // with an explicit error.
  COMMUN_S3_ENDPOINT: z.string().optional(),
  COMMUN_S3_REGION: z.string().default('fr-par'),
  COMMUN_S3_BUCKET: z.string().optional(),
  COMMUN_S3_ACCESS_KEY: z.string().optional(),
  COMMUN_S3_SECRET_KEY: z.string().optional(),
  // Emails transactionnels par webhook (9.9, décision 27/07) — le core ne
  // connaît aucun fournisseur ; absent → envois journalisés et ignorés.
  COMMUN_EMAIL_WEBHOOK_URL: z.string().optional(),
  COMMUN_EMAIL_WEBHOOK_SECRET: z.string().optional(),
  /** URL publique de l'admin — sert à construire les liens des emails. */
  COMMUN_ADMIN_URL: z.string().optional(),
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
    COMMUN_S3_ENDPOINT: raw.COMMUN_S3_ENDPOINT,
    COMMUN_S3_REGION: raw.COMMUN_S3_REGION,
    COMMUN_S3_BUCKET: raw.COMMUN_S3_BUCKET,
    COMMUN_S3_ACCESS_KEY: raw.COMMUN_S3_ACCESS_KEY,
    COMMUN_S3_SECRET_KEY: raw.COMMUN_S3_SECRET_KEY,
    COMMUN_EMAIL_WEBHOOK_URL: raw.COMMUN_EMAIL_WEBHOOK_URL,
    COMMUN_EMAIL_WEBHOOK_SECRET: raw.COMMUN_EMAIL_WEBHOOK_SECRET,
    COMMUN_ADMIN_URL: raw.COMMUN_ADMIN_URL,
  });
}
