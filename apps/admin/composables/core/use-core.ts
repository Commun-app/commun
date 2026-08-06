/**
 * Single facade over the backend domains: pages and components call
 * useCore().<domain>. Transport (use-trpc) and auth (use-session) remain
 * separate concerns at the composables root.
 */
export default function useCore() {
  return {
    definitions: useDefinitions(),
    entries: useEntries(),
    media: useMedia(),
  }
}
