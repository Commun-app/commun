import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Constantes partagées de la suite E2E (revue PR #1, 28/07) — LA source
 * unique. ⚠️ playwright.config.ts (webServer) duplique ces valeurs en
 * littéraux (sa commande shell ne peut pas importer ce module) : toute
 * modification se fait AUX DEUX endroits.
 */

/** API sous test (bootée par le webServer Playwright). */
export const API_URL = process.env.E2E_API_URL ?? 'http://127.0.0.1:3101';

/** Base de données jetable de l'API sous test. */
export const E2E_DATA_DIR = join(tmpdir(), 'commun-e2e-data');

/** MinIO E2E (second webServer). */
export const S3 = {
  endpoint: 'http://127.0.0.1:9102',
  region: 'fr-par',
  bucket: 'commun-e2e',
  accessKey: 'e2e-access',
  secretKey: 'e2e-secret-key',
} as const;

/** Webhook email — le mock (e2e/mocks) écoute sur ce port. */
export const EMAIL_WEBHOOK = {
  port: 3199,
  url: 'http://127.0.0.1:3199/emails',
  token: 'e2e-webhook-token',
  /**
   * URL du SEED : port fermé volontairement (émission best-effort ignorée) —
   * le seed tourne en execFileSync dans le worker Playwright qui héberge le
   * mock : viser le mock deadlockerait. Seuls les événements émis par le
   * SERVEUR sont capturés.
   */
  seedDiscardUrl: 'http://127.0.0.1:9/discard',
} as const;

/**
 * Mock APIDAE + hook Vercel (e2e/mocks/apidae.mock.ts) — jobs.feature.
 * L'API sous test le voit via COMMUN_APIDAE_API_URL (webServer, littéral dupliqué).
 */
export const APIDAE_MOCK = {
  port: 3198,
  apiUrl: 'http://127.0.0.1:3198/apidae',
  hookUrl: 'http://127.0.0.1:3198/vercel/hook',
  mediaBase: 'http://127.0.0.1:3198/media',
} as const;

/** Portail de connexion (troisième webServer). */
export const PORTAL_URL = 'http://127.0.0.1:3002';

export const JWT_SECRET = 'e2e-jwt-secret';
export const ADMIN_URL = 'https://admin.e2e.test';

/** Mot de passe par défaut des comptes créés par la suite. */
export const DEFAULT_PASSWORD = 'mot-de-passe-e2e';
