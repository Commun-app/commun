import { definePlugin } from 'nitro';
import { useCore } from '../utils/core.ts';

/** Instantiate the Core at server START, so migrations and config validation
 * run at boot rather than on the first request. */
export default definePlugin(() => {
  useCore();
});
