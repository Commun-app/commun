import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { join } from 'node:path';
import { APIDAE_MOCK } from '../constants.ts';

/**
 * Mock APIDAE + hook Vercel de jobs.feature. Sert le jeu de données
 * `e2e/data/apidae/objets.json` sur l'endpoint réel de pagination
 * (`list-objets-touristiques`), les binaires des illustrations (les URLs du
 * dataset sont RÉÉCRITES vers ce mock au chargement — garantie zéro appel
 * réseau sortant, même avec une capture réelle), et un hook Vercel compté.
 * Un seul fichier de feature l'utilise → un seul worker, pas de conflit de
 * port (même modèle que le mock email).
 */

type Objet = Record<string, unknown> & { id: number; illustrations?: unknown[] };

let server: Server | null = null;
let dataset: Objet[] = [];
const removedIds = new Set<number>();
let apidaeDown = false;
let hookHits = 0;

// Un vrai en-tête JPEG suffit (le sink ne décode pas l'image).
const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

function loadDataset(): Objet[] {
  const raw = JSON.parse(
    readFileSync(join(__dirname, '..', 'data', 'apidae', 'objets.json'), 'utf8'),
  ) as Objet[];
  // Réécriture des URLs d'illustrations vers le mock.
  for (const objet of raw) {
    for (const illustration of (objet.illustrations ?? []) as Array<
      Record<string, unknown> & { identifiant?: number }
    >) {
      for (const translation of (illustration.traductionFichiers ?? []) as Array<
        Record<string, unknown>
      >) {
        translation.url = `${APIDAE_MOCK.mediaBase}/${illustration.identifiant}.${translation.extension}`;
      }
    }
  }
  return raw;
}

export async function startApidaeMock(): Promise<void> {
  if (server) return;
  dataset = loadDataset();
  server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', `http://127.0.0.1:${APIDAE_MOCK.port}`);

    if (url.pathname === '/apidae/v002/recherche/list-objets-touristiques') {
      if (apidaeDown) {
        response.writeHead(503).end('APIDAE indisponible (mock)');
        return;
      }
      const query = JSON.parse(url.searchParams.get('query') ?? '{}') as {
        first?: number;
        count?: number;
      };
      const objets = dataset
        .filter((objet) => !removedIds.has(objet.id))
        .slice(query.first ?? 0, (query.first ?? 0) + (query.count ?? 20));
      response
        .writeHead(200, { 'content-type': 'application/json' })
        .end(JSON.stringify({ objetsTouristiques: objets }));
      return;
    }

    if (url.pathname.startsWith('/media/')) {
      response.writeHead(200, { 'content-type': 'image/jpeg' }).end(JPEG_BYTES);
      return;
    }

    if (url.pathname === '/vercel/hook') {
      hookHits += 1;
      response.writeHead(201, { 'content-type': 'application/json' }).end('{"job":"triggered"}');
      return;
    }

    response.writeHead(404).end('mock: route inconnue');
  });
  await new Promise<void>((resolve, reject) => {
    server!.once('error', reject);
    server!.listen(APIDAE_MOCK.port, '127.0.0.1', resolve);
  });
}

/** Simule la disparition d'un objet de la sélection source (scénario unlink). */
export function removeObjet(apidaeId: number): void {
  removedIds.add(apidaeId);
}

export function setApidaeDown(down: boolean): void {
  apidaeDown = down;
}

export function vercelHookHits(): number {
  return hookHits;
}
