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
  constructor(
    private readonly config: {
      url: string;
      token?: string;
      /**
       * Correspondance `eventName` → identifiant d'email TRANSACTIONNEL. Quand
       * elle est fournie, le corps envoyé devient `{ transactionalId, email,
       * dataVariables }` au lieu de l'événement métier.
       *
       * Pourquoi ce second format : chez les fournisseurs, un « événement »
       * déclenche un workflow marketing, soumis au statut de désabonnement du
       * contact. Un lien de réinitialisation de mot de passe ne doit JAMAIS
       * pouvoir être supprimé pour cette raison — un agent désabonné serait
       * bloqué hors de son outil de travail, sans trace. Les messages
       * transactionnels échappent à ce filtrage.
       *
       * Reste optionnel : sans cette table, le contrat d'origine est inchangé
       * et un self-hosteur reçoit toujours son événement métier.
       */
      transactionalIds?: Partial<Record<EmailEvent['eventName'], string>>;
    },
  ) {}

  static fromEnv(env: CoreEnv): EmailService {
    if (!env.COMMUN_EMAIL_WEBHOOK_URL) {
      throw new Error(
        'webhook email non configuré — renseignez COMMUN_EMAIL_WEBHOOK_URL (le serveur refuse de démarrer sans ; pointez-le sur Loops ou votre propre récepteur)',
      );
    }
    let transactionalIds: Record<string, string> | undefined;
    if (env.COMMUN_EMAIL_TRANSACTIONAL_IDS) {
      try {
        transactionalIds = JSON.parse(env.COMMUN_EMAIL_TRANSACTIONAL_IDS);
      } catch {
        throw new Error(
          'COMMUN_EMAIL_TRANSACTIONAL_IDS illisible — attendu {"userInvited":"…","passwordResetRequested":"…"}',
        );
      }
    }
    return new EmailService({
      url: env.COMMUN_EMAIL_WEBHOOK_URL,
      token: env.COMMUN_EMAIL_WEBHOOK_TOKEN,
      transactionalIds,
    });
  }

  async sendEvent(event: EmailEvent): Promise<void> {
    const transactionalId = this.config.transactionalIds?.[event.eventName];
    const body = transactionalId
      ? { transactionalId, email: event.email, dataVariables: event.eventProperties ?? {} }
      : event;

    const response = await fetch(this.config.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(this.config.token ? { authorization: `Bearer ${this.config.token}` } : {}),
      },
      body: JSON.stringify(body),
      // Un récepteur muet ne doit jamais suspendre le flux appelant.
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      throw new Error(`webhook email ${response.status}: ${(await response.text()).slice(0, 200)}`);
    }
  }
}
