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
  // Emails transactionnels par ÉVÉNEMENTS webhook (revue 28/07) — payload
  // calqué sur Loops events/send, REQUIS au boot (fail-fast, comme le S3).
  COMMUN_EMAIL_WEBHOOK_URL: z.string().optional(),
  COMMUN_EMAIL_WEBHOOK_TOKEN: z.string().optional(),
  /** URL publique de l'admin — sert à construire les liens des emails. */
  COMMUN_ADMIN_URL: z.string().optional(),
  /** Secret HMAC des JWT de session — REQUIS au boot (fail-fast). */
  COMMUN_JWT_SECRET: z.string().optional(),
  /**
   * Surcharge de la base de l'API APIDAE (E2E : mock local ; défaut HTTPS
   * dans @commun/apidae-sync, seul consommateur — déclarée ici pour que TOUT
   * l'env passe par parseEnv, review PR #4).
   */
  COMMUN_APIDAE_API_URL: z.string().optional(),
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
    COMMUN_EMAIL_WEBHOOK_TOKEN: raw.COMMUN_EMAIL_WEBHOOK_TOKEN,
    COMMUN_ADMIN_URL: raw.COMMUN_ADMIN_URL,
    COMMUN_JWT_SECRET: raw.COMMUN_JWT_SECRET,
    COMMUN_APIDAE_API_URL: raw.COMMUN_APIDAE_API_URL,
  });
}
