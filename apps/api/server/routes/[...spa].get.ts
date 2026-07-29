import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { defineHandler, HTTPError } from 'h3';

/**
 * Fallback SPA de l'image d'instance (silent-migration, D1) : l'admin
 * statique est copié dans `.output/public` au build de l'image — toute route
 * GET hors plans servis (API, tasks, health) rend son index.html, pour que
 * les routes profondes de l'admin survivent au rechargement. Dans l'image
 * API open source (sans admin embarquée), le fichier est absent : 404 comme
 * avant. Les assets existants sont servis par le statique Nitro AVANT ce
 * catch-all ; les routes déclarées (plus spécifiques) gardent la priorité.
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
