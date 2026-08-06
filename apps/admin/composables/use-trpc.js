import { createTRPCClient, httpLink } from '@trpc/client'

// tRPC client for the admin plane (/api/trpc). No transformer (none server
// side); the Authorization header re-reads the session token per request.
export default () => {
  const { public: { apiURL } } = useRuntimeConfig()
  const session = useSession()

  return createTRPCClient({
    links: [
      httpLink({
        url: `${apiURL}/api/trpc`,
        headers: () => (session.token.value ? { authorization: `Bearer ${session.token.value}` } : {})
      })
    ]
  })
}
