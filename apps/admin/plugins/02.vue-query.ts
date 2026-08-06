import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

/**
 * Query cache — server state lives here, never in a store. Pages talk to the
 * domain composables only.
 *
 * Key convention (prefix invalidation):
 *   ['definitions'] · ['entries', collectionId] · ['entries', 'byId', id]
 * A write mutates then invalidates its domain prefix; every view showing it
 * refreshes without a reload.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Freshness window, not eviction: data stays cached (gcTime) and is
        // revalidated on next use once older than this.
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })
  nuxtApp.vueApp.use(VueQueryPlugin, { queryClient })
})
