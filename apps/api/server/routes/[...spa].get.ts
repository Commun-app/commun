import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { defineHandler, HTTPError } from 'h3';

/**
 * Fallback SPA (review PR #6 : « c'est l'admin ? ») — ce fichier N'EST PAS
 * l'admin : c'est un handler HTTP catch-all, donc sa place Nitro est bien
 * routes/. L'admin est un BUILD STATIQUE copié dans `.output/public` par
 * l'image d'instance (apps/api/Dockerfile.instance) ; le statique Nitro sert
 * ses fichiers, et ce handler ne fait que rendre son index.html pour les
 * routes profondes (rechargement de /events…) hors plans servis (API,
 * tasks, health). Dans l'image API open source, pas d'admin embarquée : le
 * fichier est absent → 404 comme avant.
 */
const RESERVED_PREFIXES = ['/api/', '/_tasks/', '/health'];

let indexHtml: string | null | undefined;

export default defineHandler(async (event) => {
  const path = event.url.pathname;
  if (RESERVED_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix))) {
    throw new HTTPError({ status: 404 });
  }

  if (indexHtml === undefined) {
    // .output/server/… → ../public/index.html (layout du bundle Nitro).
    indexHtml = await readFile(join(process.cwd(), '.output/public/index.html'), 'utf8')
      .catch(() => readFile(join(import.meta.dirname, '../public/index.html'), 'utf8'))
      .catch(() => null);
  }
  if (indexHtml === null) {
    throw new HTTPError({ status: 404 });
  }

  event.res.headers.set('content-type', 'text/html; charset=utf-8');
  return indexHtml;
});
