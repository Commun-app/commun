import { traced, type Layer } from './log.ts';

/**
 * Wrap an object so every method call is traced (entry/exit/duration, indented
 * by call depth, tagged with layer:component and the correlation id). Applied at
 * the IoC root to services (`domain`) and infra adapters (`infra`) — the generic
 * alternative to hand-written per-method logging.
 */
export function instrument<T extends object>(
  target: T,
  meta: { layer: Layer; component: string },
): T {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      const value = Reflect.get(obj, prop, receiver);
      if (typeof prop === 'symbol' || typeof value !== 'function') return value;

      const method = String(prop);
      return (...args: unknown[]): unknown =>
        traced({ ...meta, method }, args, () =>
          (value as (...a: unknown[]) => unknown).apply(obj, args),
        );
    },
  });
}
