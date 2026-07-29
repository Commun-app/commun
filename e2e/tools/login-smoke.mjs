// Smoke de login de l'admin (upgrade-admin-nuxt4) — HORS CI (l'admin n'est
// pas dans la suite E2E, décision existante). Charge la page de login, se
// connecte, vérifie l'atterrissage et rapporte toute erreur console/JS.
//
// Usage :
//   1. API :   COMMUN_DATA_DIR=.dump/smoke-grigny bun --filter @commun/api dev   (port 3001)
//   2. Admin : NUXT_ENV_API_URL=http://127.0.0.1:3001 bun --filter @commun/admin dev  (port 3000)
//   3. bun e2e/tools/login-smoke.mjs
// Variables : ADMIN_URL (défaut http://localhost:3000), SMOKE_EMAIL, SMOKE_PASSWORD.
import { chromium } from '@playwright/test';

const ADMIN_URL = process.env.ADMIN_URL ?? 'http://localhost:3000';
const EMAIL = process.env.SMOKE_EMAIL ?? 'smoke@commun.app';
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'smoke-test-commun-2026';

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

let ok = false;
try {
  await page.goto(`${ADMIN_URL}/`, { waitUntil: 'networkidle', timeout: 30_000 });
  console.log('page chargée:', await page.title());

  await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"], form button').first().click();

  await page.waitForURL(/overview|dashboard/, { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
  console.log('login OK, url:', page.url());

  // La session survit au rechargement (spec admin-app).
  await page.reload({ waitUntil: 'networkidle' });
  if (/overview|dashboard/.test(page.url())) {
    console.log('session récupérée au rechargement ✓');
    ok = true;
  } else {
    console.log('ÉCHEC: session perdue au rechargement →', page.url());
  }
} catch (error) {
  console.log('ÉCHEC:', String(error.message).split('\n')[0]);
}

const uniqueErrors = [...new Set(errors)];
console.log(
  uniqueErrors.length
    ? `ERREURS console/JS (${uniqueErrors.length}):\n${uniqueErrors.slice(0, 10).join('\n')}`
    : 'aucune erreur console/JS',
);
await browser.close();
process.exit(ok && uniqueErrors.length === 0 ? 0 : 1);
