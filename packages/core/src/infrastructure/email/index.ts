import { createHmac } from 'node:crypto';
import { consola } from 'consola';
import type { CoreEnv } from '../../common/types/index.ts';
import { renderEmail } from './templates.ts';

/**
 * Emails transactionnels par WEBHOOK (décision 27/07/2026) : le core ne
 * connaît AUCUN fournisseur. L'instance POST un payload documenté sur
 * `COMMUN_EMAIL_WEBHOOK_URL` ; le récepteur (script du self-hosteur, n8n,
 * relais privé du SaaS vers Loops…) se charge de l'envoi réel.
 *
 * Payload : { template, to, variables, subject, text, sentAt } — l'email est
 * déjà rédigé (templates FR du core), le récepteur peut le transférer tel
 * quel ou le recomposer à partir des variables.
 *
 * Authenticité : si `COMMUN_EMAIL_WEBHOOK_SECRET` est configuré, le header
 * `X-Commun-Signature: sha256=<hmac-sha256(corps)>` permet au récepteur de
 * vérifier l'origine.
 *
 * Non configuré → driver `disabled` : envoi journalisé et ignoré, les flux
 * restent utilisables (lien d'invitation retourné à l'admin).
 */

export type EmailTemplate = 'invitation' | 'password-reset';

export interface EmailMessage {
  to: string;
  template: EmailTemplate;
  /** Variables métier (ex : { url }) — transmises telles quelles au webhook. */
  variables: Record<string, string>;
}

export interface EmailDriver {
  kind: 'webhook' | 'disabled';
  send(message: EmailMessage): Promise<void>;
}

export function createEmail(env: CoreEnv): EmailDriver {
  const url = env.COMMUN_EMAIL_WEBHOOK_URL;
  const secret = env.COMMUN_EMAIL_WEBHOOK_SECRET;

  if (!url) {
    return {
      kind: 'disabled',
      async send(message) {
        consola.info(
          `[email] webhook non configuré — ${message.template} → ${message.to} ignoré`,
        );
      },
    };
  }

  return {
    kind: 'webhook',
    async send(message) {
      const body = JSON.stringify({
        ...message,
        ...renderEmail(message.template, message.variables),
        sentAt: new Date().toISOString(),
      });
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (secret) {
        headers['x-commun-signature'] =
          `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
      }
      const response = await fetch(url, { method: 'POST', headers, body });
      if (!response.ok) {
        throw new Error(`webhook email ${response.status}: ${(await response.text()).slice(0, 200)}`);
      }
    },
  };
}

export { renderEmail, type RenderedEmail } from './templates.ts';
