// Garde d'authentification (refonte-admin-ui, D7) — remplace le
// globalAppMiddleware de nuxt-auth. Publics : le login ('/'), les parcours
// de mot de passe et d'invitation (enfants de l'entrance), le point de
// rappel du portail, et toute page déclarant `auth: false`.
const PUBLIC_PREFIXES = ['/password/', '/welcome/', '/auth/callback']

export default defineNuxtRouteMiddleware((to) => {
  if (to.meta.auth === false) return

  const session = useSession()
  if (session.token.value) {
    // Déjà en session sur l'écran de login : direction le tableau de bord.
    if (to.path === '/') return navigateTo('/overview', { replace: true })
    return
  }

  if (to.path === '/' || PUBLIC_PREFIXES.some((p) => to.path.startsWith(p))) return
  return navigateTo('/', { replace: true })
})
