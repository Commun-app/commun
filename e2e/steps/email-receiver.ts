import { createHmac } from 'node:crypto';
import { createServer, type Server } from 'node:http';

/**
 * Récepteur du webhook email de l'API sous test (COMMUN_EMAIL_WEBHOOK_URL
 * pointe sur le port 3199 — voir playwright.config.ts). Démarré PARESSEUSEMENT
 * par le premier step qui en a besoin : seul le worker exécutant ces scénarios
 * lie le port, pas tous les workers Playwright.
 */
export interface CapturedEmail {
  template: string;
  to: string;
  variables: Record<string, string>;
  subject: string;
  text: string;
  signatureValid: boolean;
}

const SECRET = 'e2e-webhook-secret'; // = COMMUN_EMAIL_WEBHOOK_SECRET du webServer
const PORT = 3199;

let server: Server | null = null;
const inbox: CapturedEmail[] = [];

export async function startEmailReceiver(): Promise<void> {
  if (server) return;
  server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      const expected = `sha256=${createHmac('sha256', SECRET).update(raw).digest('hex')}`;
      const payload = JSON.parse(raw) as Omit<CapturedEmail, 'signatureValid'>;
      inbox.push({
        ...payload,
        signatureValid: request.headers['x-commun-signature'] === expected,
      });
      response.writeHead(200).end('ok');
    });
  });
  await new Promise<void>((resolve, reject) => {
    server!.once('error', reject);
    server!.listen(PORT, '127.0.0.1', resolve);
  });
}

export function emailCount(): number {
  return inbox.length;
}

export function lastEmail(): CapturedEmail | undefined {
  return inbox.at(-1);
}
