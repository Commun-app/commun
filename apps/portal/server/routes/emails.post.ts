import { defineHandler, readBody } from 'h3';

/**
 * Adaptateur d'emails transactionnels (décision Quentin 04/08).
 *
 * Les instances n'émettent qu'un ÉVÉNEMENT MÉTIER — `{ email, eventName,
 * eventProperties }` — vers un webhook. Le cœur ne connaît aucun fournisseur,
 * et c'est délibéré : un self-hosteur doit rester libre de brancher le sien.
 * La logique propre au fournisseur vit donc ici, dans le cloud, jamais dans le
 * produit public.
 *
 * Pourquoi un adaptateur plutôt que l'API d'événements du fournisseur : chez
 * Loops, un événement déclenche un workflow marketing. L'email part alors avec
 * un lien de désabonnement et la mention « vous recevez cet email car vous
 * avez accepté de recevoir nos actualités » — factuellement faux pour un accès
 * à un outil de travail, et juridiquement douteux. L'API transactionnelle
 * n'a ni l'un ni l'autre, mais attend une autre forme de corps : c'est cette
 * traduction, et elle seule, que fait cette route.
 *
 * Bénéfice de bord : la clé du fournisseur ne vit plus que dans le portail.
 * Les instances clientes ne la portent plus.
 */
interface EmailEvent {
  email?: string;
  eventName?: string;
  eventProperties?: Record<string, unknown>;
}

const TIMEOUT_MS = 10_000;

/** `PORTAL_TRANSACTIONAL_IDS` : {"userInvited":"…","passwordResetRequested":"…"} */
function transactionalIds(): Record<string, string> {
  try {
    return JSON.parse(process.env.PORTAL_TRANSACTIONAL_IDS ?? '{}');
  } catch {
    return {};
  }
}

export default defineHandler(async (event) => {
  // Secret PARTAGÉ avec les instances, distinct de la clé du fournisseur :
  // une instance compromise ne doit pas livrer de quoi envoyer des emails
  // arbitraires en notre nom.
  const expected = process.env.PORTAL_WEBHOOK_TOKEN;
  const provided = (event.req.headers.get('authorization') ?? '').replace(/^Bearer /, '');
  if (!expected || provided !== expected) {
    event.res.status = 401;
    return { error: 'non autorisé' };
  }

  const { email, eventName, eventProperties } = ((await readBody(event)) ?? {}) as EmailEvent;
  if (!email || !eventName) {
    event.res.status = 400;
    return { error: 'email et eventName requis' };
  }

  const transactionalId = transactionalIds()[eventName];
  if (!transactionalId) {
    // Un événement sans email associé n'est pas une erreur de l'appelant :
    // l'instance a fait son travail. On l'accepte et on le signale, plutôt
    // que de faire échouer un flux métier pour une configuration manquante.
    console.warn(`[emails] aucun email transactionnel configuré pour ${eventName}`);
    event.res.status = 202;
    return { delivered: false, reason: 'aucun modèle configuré' };
  }

  const response = await fetch('https://app.loops.so/api/v1/transactional', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.PORTAL_LOOPS_KEY ?? ''}`,
    },
    body: JSON.stringify({ transactionalId, email, dataVariables: eventProperties ?? {} }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    console.error(
      `[emails] ${eventName} → ${response.status}: ${(await response.text()).slice(0, 200)}`,
    );
    event.res.status = 502;
    return { error: "le fournisseur d'emails a refusé l'envoi" };
  }
  return { delivered: true };
});
