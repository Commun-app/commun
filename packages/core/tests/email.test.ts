import { afterAll, describe, expect, test } from 'bun:test';
import { createHmac } from 'node:crypto';
import { createEmail } from '../src/infrastructure/email/index.ts';
import { parseEnv } from '../src/common/env/index.ts';

// Récepteur webhook local : capture le corps brut et les headers.
let received: { raw: string; signature: string | null } | null = null;
const server = Bun.serve({
  port: 0,
  async fetch(request) {
    received = {
      raw: await request.text(),
      signature: request.headers.get('x-commun-signature'),
    };
    return new Response('ok');
  },
});

afterAll(() => server.stop(true));

const baseEnv = { COMMUN_DATA_DIR: '/tmp/unused-email-test' };

describe('email webhook driver (9.9, décision 27/07)', () => {
  test('sans COMMUN_EMAIL_WEBHOOK_URL : driver disabled, envoi silencieux', async () => {
    const driver = createEmail(parseEnv(baseEnv));
    expect(driver.kind).toBe('disabled');
    await driver.send({ to: 'a@b.fr', template: 'invitation', variables: {} }); // ne jette pas
  });

  test('POST le payload complet : email rendu en français + variables + signature HMAC', async () => {
    const secret = 'secret-webhook-test';
    const driver = createEmail(
      parseEnv({
        ...baseEnv,
        COMMUN_EMAIL_WEBHOOK_URL: `http://127.0.0.1:${server.port}/emails`,
        COMMUN_EMAIL_WEBHOOK_SECRET: secret,
      }),
    );
    expect(driver.kind).toBe('webhook');

    await driver.send({
      to: 'agent@grigny.fr',
      template: 'invitation',
      variables: { url: 'https://admin.grigny.fr/welcome/tok123' },
    });

    const payload = JSON.parse(received!.raw);
    expect(payload.to).toBe('agent@grigny.fr');
    expect(payload.template).toBe('invitation');
    expect(payload.variables.url).toBe('https://admin.grigny.fr/welcome/tok123');
    // L'email est DÉJÀ rédigé : un récepteur peut le transférer tel quel.
    expect(payload.subject).toContain('Invitation');
    expect(payload.text).toContain('https://admin.grigny.fr/welcome/tok123');
    expect(payload.text).toContain('valable 7 jours');
    // Signature vérifiable par le récepteur.
    const expected = `sha256=${createHmac('sha256', secret).update(received!.raw).digest('hex')}`;
    expect(received!.signature).toBe(expected);
  });

  test('récepteur en erreur → le driver jette (le service, lui, absorbe)', async () => {
    const driver = createEmail(
      parseEnv({
        ...baseEnv,
        COMMUN_EMAIL_WEBHOOK_URL: `http://127.0.0.1:1`, // port fermé
      }),
    );
    await expect(
      driver.send({ to: 'a@b.fr', template: 'password-reset', variables: {} }),
    ).rejects.toThrow();
  });
});
