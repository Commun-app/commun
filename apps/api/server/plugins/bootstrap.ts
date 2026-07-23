import { definePlugin } from 'nitro';
import { consola } from 'consola';
import { createInvitation, users } from '@commun/core';
import { useCore } from '../services/context.ts';

/**
 * First-boot admin bootstrap (spec self-hosting). When the instance has ZERO
 * users, a single-use invitation link is generated for COMMUN_ADMIN_EMAIL and
 * printed to the logs. Once any user exists the mechanism is inert — it can
 * never be replayed to take over an initialised instance.
 */
export default definePlugin(() => {
  const core = useCore();
  const hasUsers = core.db.select({ id: users.id }).from(users).limit(1).all().length > 0;
  if (hasUsers) return;

  const email = core.env.COMMUN_ADMIN_EMAIL;
  if (!email) {
    consola.warn(
      'Instance vierge et COMMUN_ADMIN_EMAIL non défini — définissez-le puis redémarrez pour créer le premier compte admin.',
    );
    return;
  }

  const { token, expiresAt } = createInvitation(core.db, { email, role: 'admin' });
  consola.box(
    `Première initialisation de Commun\n\n` +
      `Lien d'invitation admin (usage unique, expire le ${expiresAt}) :\n` +
      `/welcome?token=${token}\n\n` +
      `À consommer via tRPC auth.acceptInvitation avec ce token.`,
  );
});
