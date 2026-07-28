import type { CoreEnv } from '../../common/types/index.ts';

/**
 * Emails transactionnels par ÉVÉNEMENTS (revue PR #1, 28/07) : le core ne
 * rédige aucun email et ne connaît aucun fournisseur — il POST un événement
 * métier `{ email, eventName, eventProperties }` sur l'URL configurée, avec
 * `Authorization: Bearer <token>` si un token est fourni.
 *
 * Le payload est volontairement calqué sur l'API « events/send » de Loops
 * (https://loops.so/docs/api-reference/send-event) : pointer
 * COMMUN_EMAIL_WEBHOOK_URL sur https://app.loops.so/api/v1/events/send avec
 * la clé API Loops en token suffit — le templating et les workflows vivent
 * chez Loops. Un self-hosteur pointe ce qu'il veut (n8n, script, autre
 * fournisseur) : même contrat.
 *
 * FAIL-FAST : sans COMMUN_EMAIL_WEBHOOK_URL, le boot échoue — comme le S3.
 */

export interface EmailEvent {
  /** Destinataire. */
  email: string;
  /** Nom d'événement métier (déclenche le workflow côté récepteur). */
  eventName: 'userInvited' | 'passwordResetRequested';
  /** Variables injectées dans le template par le récepteur. */
  eventProperties?: Record<string, string | number | boolean>;
}

export class EmailService {
  constructor(private readonly config: { url: string; token?: string }) {}

  static fromEnv(env: CoreEnv): EmailService {
    if (!env.COMMUN_EMAIL_WEBHOOK_URL) {
      throw new Error(
        'webhook email non configuré — renseignez COMMUN_EMAIL_WEBHOOK_URL (le serveur refuse de démarrer sans ; pointez-le sur Loops events/send ou votre propre récepteur)',
      );
    }
    return new EmailService({
      url: env.COMMUN_EMAIL_WEBHOOK_URL,
      token: env.COMMUN_EMAIL_WEBHOOK_TOKEN,
    });
  }

  async sendEvent(event: EmailEvent): Promise<void> {
    const response = await fetch(this.config.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(this.config.token ? { authorization: `Bearer ${this.config.token}` } : {}),
      },
      body: JSON.stringify(event),
      // Un récepteur muet ne doit jamais suspendre le flux appelant.
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      throw new Error(`webhook email ${response.status}: ${(await response.text()).slice(0, 200)}`);
    }
  }
}
