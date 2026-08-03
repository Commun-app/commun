<template>
  <div class="mt-12 text-center text-sm text-gray-500">
    Connexion en cours…
  </div>
</template>

<script setup>
// Point de rappel d'une authentification EXTERNE — générique, pas réservé au
// cloud (décision Quentin 03/08). Un émetteur de confiance dépose ici une
// session déjà obtenue : aujourd'hui le portail de migration, demain le
// connecteur OIDC (phase 6), qui utilisera exactement la même route.
//
// Le token arrive en FRAGMENT d'URL — jamais en query, donc jamais dans les
// journaux ni les en-têtes ; c'est la forme du flux implicite d'OAuth. Il est
// rangé comme une session nuxt-auth normale, puis le fragment est effacé de
// l'historique.
//
// Cette route n'accorde AUCUN accès supplémentaire : le token qu'elle installe
// a été émis par cette instance même, et ne s'obtient qu'en s'authentifiant
// auprès d'elle. Un token absent ou invalide ramène au login, sans erreur
// technique.
definePageMeta({ auth: false })

const { getSession } = useAuth()
const { setToken } = useAuthState()

onMounted(async () => {
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
  window.history.replaceState(null, '', '/auth/callback')
  if (!token) {
    return navigateTo('/', { replace: true })
  }

  setToken(token)
  try {
    const session = await getSession()
    if (!session) throw new Error('E_INVALID_TOKEN')
    await navigateTo('/overview', { replace: true })
  } catch {
    setToken(null)
    await navigateTo('/', { replace: true })
  }
})
</script>
