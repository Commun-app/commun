import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { deserialize } from 'bson';

/**
 * Offline dump reader (spec legacy-migration): supports both `mongodump`
 * output (<dump>/<db>/<collection>.bson) and `mongoexport` JSONL files
 * (<dump>/<collection>.jsonl). NEVER connects to any database.
 */
export type LegacyDoc = Record<string, unknown>;

function* readBsonFile(path: string): Generator<LegacyDoc> {
  const buffer = readFileSync(path);
  let offset = 0;
  while (offset < buffer.length) {
    const size = buffer.readInt32LE(offset);
    yield deserialize(buffer.subarray(offset, offset + size)) as LegacyDoc;
    offset += size;
  }
}

function* readJsonlFile(path: string): Generator<LegacyDoc> {
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed) yield JSON.parse(trimmed) as LegacyDoc;
  }
}

/** Locate `<collection>.bson` or `<collection>.jsonl` anywhere under dumpDir. */
function findCollectionFile(dumpDir: string, collection: string): string | null {
  const stack = [dumpDir];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) stack.push(path);
      else if (entry === `${collection}.bson` || entry === `${collection}.jsonl`) return path;
    }
  }
  return null;
}

export function readCollection(dumpDir: string, collection: string): LegacyDoc[] {
  const path = findCollectionFile(dumpDir, collection);
  if (!path) return [];
  const docs = path.endsWith('.bson') ? readBsonFile(path) : readJsonlFile(path);
  return [...docs];
}

/** Normalise Mongo extended-JSON / BSON values ($oid, ObjectId, $date, Date). */
export function idOf(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const object = value as Record<string, unknown>;
    if (typeof object.$oid === 'string') return object.$oid;
    return String(value);
  }
  return String(value);
}

export function dateOf(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (typeof value === 'object') {
    const wrapped = (value as Record<string, unknown>).$date;
    if (wrapped) return dateOf(wrapped);
  }
  return null;
}
