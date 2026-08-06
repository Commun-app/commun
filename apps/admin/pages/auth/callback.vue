<template>
  <div class="mt-12 text-center text-sm text-gray-500">
    Connexion en cours…
  </div>
</template>

<script setup>
// Callback for externally issued sessions (portal today, OIDC later). The
// token arrives in the URL FRAGMENT so it never reaches logs or headers,
// and grants nothing extra: it was issued by this very instance. Absent or
// invalid, back to login without a technical error.
definePageMeta({ auth: false })

const session = useSession()

onMounted(async () => {
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
  window.history.replaceState(null, '', '/auth/callback')
  if (!token) {
    return navigateTo('/', { replace: true })
  }

  session.setToken(token)
  const user = await session.refresh()
  if (user) {
    await navigateTo('/overview', { replace: true })
  } else {
    await navigateTo('/', { replace: true })
  }
})
</script>
