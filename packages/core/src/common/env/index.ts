import { homedir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';

// The COMMUN_ prefix namespaces the process environment we read from a shared
// host (compose, systemd, CI), and makes `env | grep COMMUN_` the whole story.
//
// This schema is the ONLY configuration contract: what the instance cannot run
// without is required here, and boot fails at parse time. Never re-check a
// variable downstream.
const required = z.string().min(1);

const envSchema = z.object({
  COMMUN_DATA_DIR: z.string().default(join(homedir(), '.commun')),
  COMMUN_MIGRATIONS_DIR: z.string().optional(),
  COMMUN_S3_ENDPOINT: z.string().optional(),
  COMMUN_S3_REGION: z.string().default('fr-par'),
  COMMUN_S3_BUCKET: required,
  COMMUN_S3_ACCESS_KEY: required,
  COMMUN_S3_SECRET_KEY: required,
  COMMUN_EMAIL_WEBHOOK_URL: required,
  COMMUN_EMAIL_WEBHOOK_TOKEN: z.string().optional(),
  COMMUN_ADMIN_URL: z.string().optional(),
  COMMUN_JWT_SECRET: required,
  COMMUN_APIDAE_API_URL: z.string().optional(),
});

export type CoreEnv = z.infer<typeof envSchema>;

/**
 * Parse and validate the environment at the app boundary. Call once at startup:
 * the result flows through DI, nothing reads process.env afterwards.
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
