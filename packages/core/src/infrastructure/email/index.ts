import { consola } from 'consola';
import type { CoreEnv } from '../../common/types/index.ts';

/**
 * Emails transactionnels via Loops (demande Quentin, tâche 9.9) — le legacy
 * n'envoyait JAMAIS d'email (lien d'invitation copié à la main).
 *
 * Non configuré (pas de COMMUN_LOOPS_API_KEY) → driver `disabled` : l'envoi
 * est journalisé et silencieusement ignoré, les flux restent utilisables
 * (le lien d'invitation est toujours retourné à l'admin). L'auto-hébergement
 * fonctionne donc sans compte Loops.
 */

export type EmailTemplate = 'invitation' | 'password-reset';

export interface EmailMessage {
  to: string;
  template: EmailTemplate;
  /** Variables du template Loops (dataVariables) — ex : { url, communeName }. */
  variables: Record<string, string>;
}

export interface EmailDriver {
  kind: 'loops' | 'disabled';
  send(message: EmailMessage): Promise<void>;
}

const LOOPS_API_URL = 'https://app.loops.so/api/v1/transactional';

export function createEmail(env: CoreEnv): EmailDriver {
  const apiKey = env.COMMUN_LOOPS_API_KEY;
  const templateIds: Record<EmailTemplate, string | undefined> = {
    invitation: env.COMMUN_LOOPS_TX_INVITATION,
    'password-reset': env.COMMUN_LOOPS_TX_PASSWORD_RESET,
  };

  if (!apiKey) {
    return {
      kind: 'disabled',
      async send(message) {
        consola.info(`[email] Loops non configuré — ${message.template} → ${message.to} ignoré`);
      },
    };
  }

  return {
    kind: 'loops',
    async send(message) {
      const transactionalId = templateIds[message.template];
      if (!transactionalId) {
        consola.warn(`[email] template Loops manquant pour "${message.template}" — envoi ignoré`);
        return;
      }
      const response = await fetch(LOOPS_API_URL, {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          transactionalId,
          email: message.to,
          dataVariables: message.variables,
        }),
      });
      if (!response.ok) {
        throw new Error(`Loops ${response.status}: ${(await response.text()).slice(0, 200)}`);
      }
    },
  };
}
