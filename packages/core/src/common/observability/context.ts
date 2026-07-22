import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Ambient observability context carried across async calls without threading it
 * through every signature.
 * - `correlationId` ties together every call made while handling one logical
 *   unit of work (a tRPC request, an event reaction).
 * - `depth` is the call-nesting level, used to indent trace lines so the
 *   transport → domain → infra hierarchy is readable.
 */
export interface ObsContext {
  correlationId: string;
  depth: number;
}

const storage = new AsyncLocalStorage<ObsContext>();

/** Run `fn` under a fresh correlation id at depth 0. */
export function runWithCorrelation<T>(correlationId: string, fn: () => T): T {
  return storage.run({ correlationId, depth: 0 }, fn);
}

/** The current observability context, if any. */
export function getObsContext(): ObsContext | undefined {
  return storage.getStore();
}

/** Run `fn` at a given nesting depth, preserving the correlation id. */
export function runAtDepth<T>(depth: number, fn: () => T): T {
  const current = storage.getStore();
  return storage.run({ correlationId: current?.correlationId ?? '–', depth }, fn);
}
