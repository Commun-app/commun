// common/types — cross-cutting base types.
// NOTE: the `Core` / `CoreContext` aggregate types live in `./core.ts`; they
// reference infrastructure adapters via `import type` only (the
// composition-root shape inherently names what it assembles).

export * from './base.ts';
export * from './core.ts';
