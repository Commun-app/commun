import { createTRPCClient, httpLink } from '@trpc/client'

// @review: est-ce que trpc embarque une logique de caching, de polling, scroll etc comme tanstack query ?
// Client tRPC vers le monolithe Commun (plan admin, monté sur /api/trpc).
// Pas de transformer (le serveur n'en configure pas). Le header Authorization
// relit le token de session courant à chaque requête.
export default () => {
  const { public: { apiURL } } = useRuntimeConfig()
  const auth = useAuth()

  return createTRPCClient({
    links: [
      httpLink({
        url: `${apiURL}/api/trpc`,
        headers: () => (auth.token.value ? { authorization: auth.token.value } : {})
      })
    ]
  })
}
