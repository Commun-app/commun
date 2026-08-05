import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { defineHandler, HTTPError } from 'h3';

/**
 * SPA fallback for the admin, which ships as a static build under
 * `.output/public`. Deep routes (a reload on /events…) fall through to its
 * index.html, except on the served planes below.
 *
 * Without an embedded admin — the open source API image — the file is absent
 * and every path 404s, as before.
 */
const RESERVED_PREFIXES = ['/api/', '/_tasks/', '/health'];

let indexHtml: string | null | undefined;

export default defineHandler(async (event) => {
  const path = event.url.pathname;
  if (RESERVED_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix))) {
    throw new HTTPError({ status: 404 });
  }

  if (indexHtml === undefined) {
    // .output/server/… → ../public/index.html (Nitro bundle layout).
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
