<template>
  <div class="min-h-screen bg-white flex">
    <div class="m-auto w-full max-w-lg lg:w-96">
      <div class="flex flex-col items-center space-y-2 mb-4">
        <img
          src="/logo-black.svg"
          alt="Logo de Politicus"
          class="dark:hidden h-16 w-auto"
        >
        <img
          src="/logo-white.svg"
          alt="Logo de Politicus"
          class="hidden h-24 w-auto"
        >
        <p v-if="demoEnv" class="text-sm text-gray-400 w-full border-t border-gray-100 text-center pt-2">
          <span class="bg-black rounded-lg text-white px-4 text-xs py-0.5 h-5 mx-auto">
            beta
          </span>
        </p>
      </div>
      <nuxt-page />
    </div>
  </div>
</template>

<script setup>
const $config = useRuntimeConfig()

definePageMeta({
  layout: 'entrance',
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: '/overview',
  }
})

// Prepare computed
// L'image d'instance est COMMUNE à tous les clients : rien de spécifique n'y est
// cuit. L'hôte servi est donc la seule source fiable pour distinguer une démo.
const demoEnv = computed(() => {
  const host = import.meta.client ? window.location.host : ''
  return host.includes('.beta') || host.includes('localhost')
})
</script>