// Auth guard. Public: login ('/'), password and invitation flows, the
// external-session callback, and any page declaring `auth: false`.
const PUBLIC_PREFIXES = ['/password/', '/welcome/', '/auth/callback']

export default defineNuxtRouteMiddleware((to) => {
  if (to.meta.auth === false) return

  const session = useSession()
  if (session.token.value) {
    if (to.path === '/') return navigateTo('/overview', { replace: true })
    return
  }

  if (to.path === '/' || PUBLIC_PREFIXES.some((p) => to.path.startsWith(p))) return
  return navigateTo('/', { replace: true })
})
