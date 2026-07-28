import { defineHandler, HTTPError } from 'h3';
import { runTask } from 'nitro/task';

/**
 * Exécution HTTP d'une tâche Nitro — l'endpoint `/_nitro/tasks` n'existe que
 * dans le preset dev, or la suite E2E boote le bundle de production. Route
 * INTERNE, morte sans opt-in explicite : seul le harness E2E pose
 * COMMUN_TASKS_HTTP=1 (ni le Dockerfile, ni le smoke CI, ni la prod).
 */
export default defineHandler(async (event) => {
  if (process.env.COMMUN_TASKS_HTTP !== '1') {
    throw new HTTPError({ status: 404 });
  }
  const name = event.context.params?.name;
  if (!name) {
    throw new HTTPError({ status: 400, message: 'nom de tâche manquant' });
  }
  return runTask(name);
});
