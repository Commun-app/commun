#!/usr/bin/env bun
// Golden-master diff — cutover tooling. Fetches the SAME content endpoints
// from the legacy PRODUCTION and from a LOCAL instance running on the
// migrated dump, normalises what legitimately differs (S3 signature query
// strings, host/bucket prefixes, array ordering of slugs), and reports every
// remaining difference. Usage:
//   bun src/golden-diff.ts --prod https://api.… --local http://127.0.0.1:3001 \
//     --token <device-token> --out report.json [--local-bucket poulpus]
import { writeFileSync } from 'node:fs';
import { consola } from 'consola';

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i]!.replace(/^--/, ''), process.argv[i + 1] ?? '');
}
const PROD = args.get('prod')!;
const LOCAL = args.get('local') ?? 'http://127.0.0.1:3001';
const TOKEN = args.get('token')!;
const LOCAL_BUCKET = args.get('local-bucket') ?? 'poulpus';
const OUT = args.get('out') ?? 'golden-diff.json';

/** Signed S3 URL → its object key (drops origin, query, bucket prefix). */
function normalizeValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (!value.startsWith('http') || !value.includes('X-Amz-')) return value;
  try {
    const url = new URL(value);
    let path = decodeURIComponent(url.pathname).replace(/^\//, '');
    if (path.startsWith(`${LOCAL_BUCKET}/`)) path = path.slice(LOCAL_BUCKET.length + 1);
    return `s3://${path}`;
  } catch {
    return value;
  }
}

function normalize(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(normalize);
  if (node !== null && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(node as Record<string, unknown>).sort()) {
      out[key] = normalize((node as Record<string, unknown>)[key]);
    }
    return out;
  }
  // Wysiwyg is a stringified doc that CONTAINS signed URLs — normalise inside.
  if (typeof node === 'string' && node.startsWith('{') && node.includes('X-Amz-')) {
    try {
      return JSON.stringify(normalize(JSON.parse(node)));
    } catch {
      return normalizeValue(node);
    }
  }
  return normalizeValue(node);
}

/** Deep diff — collects paths that differ (bounded output). */
function diff(a: unknown, b: unknown, path: string, out: string[], max = 400): void {
  if (out.length >= max) return;
  if (typeof a !== typeof b || (a === null) !== (b === null)) {
    out.push(`${path}: type ${typeof a} → ${typeof b}`);
    return;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) out.push(`${path}: length ${a.length} → ${b.length}`);
    for (let i = 0; i < Math.min(a.length, b.length); i++) diff(a[i], b[i], `${path}[${i}]`, out, max);
    return;
  }
  if (a !== null && typeof a === 'object') {
    const ka = Object.keys(a as object);
    const kb = new Set(Object.keys(b as object));
    for (const k of ka) {
      if (!kb.has(k)) out.push(`${path}.${k}: absent côté local`);
      else diff((a as never)[k], (b as never)[k], `${path}.${k}`, out, max);
      kb.delete(k);
    }
    for (const k of kb) out.push(`${path}.${k}: absent côté prod`);
    return;
  }
  if (a !== b) {
    const va = String(a).slice(0, 60);
    const vb = String(b).slice(0, 60);
    out.push(`${path}: "${va}" → "${vb}"`);
  }
}

async function fetchJson(base: string, route: string): Promise<unknown> {
  const response = await fetch(`${base}${route}`, { headers: { authorization: TOKEN } });
  if (!response.ok) throw new Error(`${base}${route} → HTTP ${response.status}`);
  return response.json();
}

const report: Record<string, unknown> = {};
for (const route of ['/api/v1/content/records', '/api/v1/content/deployment']) {
  consola.start(route);
  // Une route en échec (ex: deployment cmar-paca → 503 en prod) est consignée
  // dans le rapport sans avorter la comparaison des autres routes.
  let prod: unknown;
  let local: unknown;
  try {
    [prod, local] = await Promise.all([fetchJson(PROD, route), fetchJson(LOCAL, route)]);
  } catch (error) {
    report[route] = { error: String(error) };
    consola.error(`${route}: ${String(error)}`);
    continue;
  }
  const np = normalize((prod as { data: unknown }).data) as Record<string, unknown>;
  const nl = normalize((local as { data: unknown }).data) as Record<string, unknown>;
  // Slugs order is not contractual — compare as sets.
  if (Array.isArray(np.slugs)) np.slugs = [...(np.slugs as string[])].sort();
  if (Array.isArray(nl.slugs)) nl.slugs = [...(nl.slugs as string[])].sort();

  const differences: string[] = [];
  diff(np, nl, 'data', differences);
  report[route] = { differences: differences.length, sample: differences.slice(0, 120) };
  consola[differences.length === 0 ? 'success' : 'warn'](`${route}: ${differences.length} différences`);
}
writeFileSync(OUT, JSON.stringify(report, null, 2));
consola.info(`rapport: ${OUT}`);
