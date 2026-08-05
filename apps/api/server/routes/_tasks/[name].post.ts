import { defineHandler, HTTPError } from 'h3';
import { runTask } from 'nitro/task';

/**
 * Runs a Nitro task over HTTP, for the E2E suite only: Nitro's own task
 * endpoint exists in the dev preset, and the suite boots the production bundle.
 *
 * DEAD unless COMMUN_TASKS_HTTP=1, which only the E2E harness sets — never the
 * Docker image, the CI smoke test, or a deployed instance.
 */
export default defineHandler(async (event) => {
  if (process.env.COMMUN_TASKS_HTTP !== '1') {
    throw new HTTPError({ status: 404 });
  }
  const name = event.context.params?.name;
  if (!name) {
    throw new HTTPError({ status: 400, message: 'missing task name' });
  }
  return runTask(name);
});
