/**
 * Production boot guard (spec tenant-auth: "Aucun secret par défaut").
 *
 * There is deliberately no global session secret in Commun — sessions are
 * opaque random tokens stored hashed. The guard therefore protects against
 * the other failure mode: shipping an instance whose configured values are
 * still placeholders. Mandatory secrets added later (S3 credentials, AI keys)
 * register themselves in REQUIRED_IN_PRODUCTION.
 */

const PLACEHOLDER_PATTERN = /^(@?change[-_]?me|example|placeholder|secret|xxx+)$/i;

/** Env vars that MUST be set (non-placeholder) when NODE_ENV=production. */
const REQUIRED_IN_PRODUCTION: string[] = [
  // 'S3_SECRET_KEY' — enabled with the media S3 driver when configured.
];

export function assertProductionConfig(env: Record<string, string | undefined> = process.env): void {
  if (env.NODE_ENV !== 'production') return;

  const problems: string[] = [];
  for (const key of REQUIRED_IN_PRODUCTION) {
    const value = env[key];
    if (!value) problems.push(`${key} manquant`);
    else if (PLACEHOLDER_PATTERN.test(value)) problems.push(`${key} vaut une valeur d'exemple`);
  }
  // Any configured var carrying an obvious placeholder is refused too.
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith('COMMUN_') && value && PLACEHOLDER_PATTERN.test(value)) {
      problems.push(`${key} vaut une valeur d'exemple`);
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `Configuration de production invalide — démarrage refusé : ${problems.join(', ')}`,
    );
  }
}
