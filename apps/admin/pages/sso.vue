<template>
  <div class="mt-12 text-center text-sm text-gray-500">
    Connexion en cours…
  </div>
</template>

<script setup>
// Remise de session par le portail (silent-migration, D7) : le token arrive
// en FRAGMENT d'URL (jamais en query — rien dans les logs), est stocké comme
// une session nuxt-auth normale, puis le fragment est nettoyé de
// l'historique. Token absent ou invalide → retour au login, sans erreur
// technique.
definePageMeta({ auth: false })

const { getSession } = useAuth()
const { setToken } = useAuthState()

onMounted(async () => {
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
  window.history.replaceState(null, '', '/sso')
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
