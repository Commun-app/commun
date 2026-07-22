import { consola } from 'consola';
import { getObsContext, runAtDepth } from './context.ts';

export type Layer = 'transport' | 'domain' | 'infra';

export interface TraceMeta {
  layer: Layer;
  component: string;
  method: string;
}

const MAX = 160;

/** Compact, single-line preview of any value (whitespace collapsed, truncated). */
function fmt(value: unknown): string {
  let s: string;
  try {
    s = typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
  if (s === undefined) return String(value);
  s = s.replace(/\s+/g, ' ').trim();
  return s.length > MAX ? `${s.slice(0, MAX)}… (${s.length})` : s;
}

function fmtArgs(args: unknown[]): string {
  return `(${args.map(fmt).join(', ')})`;
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function localTime(): string {
  const d = new Date();
  return `${d.toTimeString().slice(0, 8)}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

function line(
  depth: number,
  arrow: '↓' | '↑' | '✗',
  meta: TraceMeta,
  cid: string,
  opts: { dur?: number; args?: unknown[]; out?: unknown; err?: unknown },
): void {
  const indent = '  '.repeat(Math.max(0, depth));
  const dur = opts.dur == null ? '' : ` [${opts.dur}ms]`;
  const body =
    arrow === '↓' ? fmtArgs(opts.args ?? []) : arrow === '✗' ? errMessage(opts.err) : fmt(opts.out);
  consola.debug(
    `${localTime()} ${indent}[${meta.layer}:${meta.component}] ${arrow} ${meta.method} [${cid}]${dur} ${body}`,
  );
}

/**
 * Trace a call: logs an entry line (`↓`) and an exit (`↑` with duration) or
 * failure (`✗`) line, indented by call depth and tagged with the correlation id.
 * Runs `fn` one depth deeper so nested traced calls are visually nested. Async
 * results are awaited so the exit line carries the resolved value.
 */
export function traced<T>(meta: TraceMeta, args: unknown[], fn: () => T): T {
  const ctx = getObsContext();
  const depth = ctx?.depth ?? 0;
  const cid = ctx?.correlationId ?? '–';

  line(depth, '↓', meta, cid, { args });
  const start = Date.now();
  const onOk = (out: unknown): unknown => {
    line(depth, '↑', meta, cid, { dur: Date.now() - start, out });
    return out;
  };
  const onErr = (err: unknown): never => {
    line(depth, '✗', meta, cid, { dur: Date.now() - start, err });
    throw err;
  };

  let result: unknown;
  try {
    result = runAtDepth(depth + 1, fn);
  } catch (err) {
    return onErr(err);
  }
  return (result instanceof Promise ? result.then(onOk, onErr) : onOk(result)) as T;
}
