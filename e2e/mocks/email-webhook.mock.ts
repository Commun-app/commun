import { createServer, type Server } from 'node:http';
import { EMAIL_WEBHOOK } from '../constants.ts';

/**
 * Récepteur du webhook email de l'API sous test (COMMUN_EMAIL_WEBHOOK_URL
 * pointe sur le port 3199 — voir playwright.config.ts). Le core émet des
 * ÉVÉNEMENTS au format Loops events/send : { email, eventName,
 * eventProperties }, authentifiés par `Authorization: Bearer <token>`.
 * Démarré PARESSEUSEMENT par le premier step qui en a besoin.
 */
export interface CapturedEvent {
  email: string;
  eventName: string;
  eventProperties: Record<string, string>;
  authValid: boolean;
}

let server: Server | null = null;
const inbox: CapturedEvent[] = [];

export async function startEmailReceiver(): Promise<void> {
  if (server) return;
  server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      const payload = JSON.parse(Buffer.concat(chunks).toString('utf8')) as Omit<
        CapturedEvent,
        'authValid'
      >;
      inbox.push({
        ...payload,
        authValid: request.headers.authorization === `Bearer ${EMAIL_WEBHOOK.token}`,
      });
      response.writeHead(200).end('ok');
    });
  });
  await new Promise<void>((resolve, reject) => {
    server!.once('error', reject);
    server!.listen(EMAIL_WEBHOOK.port, '127.0.0.1', resolve);
  });
}

export function emailCount(): number {
  return inbox.length;
}

export function lastEmail(): CapturedEvent | undefined {
  return inbox.at(-1);
}
