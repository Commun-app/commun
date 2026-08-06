<template>
  <UApp :locale="fr">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup>
// UApp provides the Nuxt UI overlay providers (tooltips, toasts) —
// components using them crash without it.
import { fr } from '@nuxt/ui/locale'
</script>
