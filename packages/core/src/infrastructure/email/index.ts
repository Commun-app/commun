import type { CoreEnv } from '../../common/types/index.ts';

/**
 * The core sends business EVENTS, never emails: it knows no provider, no
 * template, no copy. Point COMMUN_EMAIL_WEBHOOK_URL at whatever consumes them.
 *
 * The payload mirrors the Loops `events/send` shape, so pointing it straight at
 * Loops works without an adapter — but any receiver honouring the same contract
 * does too, which is what keeps self-hosting free of a provider.
 */
export interface EmailEvent {
  email: string;
  eventName: 'userInvited' | 'passwordResetRequested';
  eventProperties?: Record<string, string | number | boolean>;
}

export class EmailService {
  constructor(private readonly config: { url: string; token?: string }) {}

  static fromEnv(env: CoreEnv): EmailService {
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
      // A silent receiver must never hold up the calling flow.
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      throw new Error(`email webhook ${response.status}: ${(await response.text()).slice(0, 200)}`);
    }
  }
}
