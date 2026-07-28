import { definePlugin } from 'nitro';
import { useCore } from '../utils/core.ts';

/**
 * Instancie le Core AU DÉMARRAGE du serveur (revue PR #1, 28/07) : les
 * migrations et le fail-fast de config jouent au boot, pas au premier
 * appel HTTP/tRPC. Les handlers continuent d'appeler `useCore()`.
 */
export default definePlugin(() => {
  useCore();
});
