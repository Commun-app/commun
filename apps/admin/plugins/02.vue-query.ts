import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

/**
 * Cache de requêtes de l'admin (refonte-admin-ui, D5) : l'état SERVEUR vit
 * ici — jamais dans un store. Les pages ne touchent ni ce client ni tRPC :
 * elles parlent aux composables par domaine (use-definitions, use-entries…).
 *
 * Convention de clés — l'invalidation se fait PAR PRÉFIXE :
 *   ['definitions']                      toutes les définitions
 *   ['entries', <collection>]            les listes d'une collection
 *   ['entries', <collection>, <id>]      une entrée
 *   ['organization'] · ['users'] · ['media', <id>]…
 * Écrire = muter puis invalider le préfixe du domaine touché ; toutes les
 * vues qui l'affichent se rafraîchissent sans rechargement.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Un admin de commune : peu d'écritures concurrentes — 30 s de
        // fraîcheur évitent les rafales de refetch à chaque navigation.
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })
  nuxtApp.vueApp.use(VueQueryPlugin, { queryClient })
})
