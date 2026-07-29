<template>
  <div class="flex flex-col space-y-1 py-1 items-start justify-center text-sm cursor-pointer" @click="$emit('click')">
    <data-display-badge-publish-status :status="status" class="sm:hidden" />
    <div class="flex items-center space-x-2">
      <!-- max-w borné (upgrade-admin-nuxt4) : truncate = nowrap, un titre long
           dictait la largeur max-content de la colonne (table-auto). -->
      <p class="font-normal xs:w-60 truncate sm:min-w-0 sm:max-w-xl">
        {{ title }}
      </p>
      <data-display-badge-publish-status :status="status" class="hidden sm:inline-flex" />
    </div>
    <!-- Bornée (upgrade-admin-nuxt4) : une description longue étirait la
         colonne au-delà de l'écran (table-auto suit la largeur du contenu). -->
    <p class="hidden sm:block font-light text-gray-500 max-w-xl line-clamp-2 break-words">
      {{ description }}
    </p>
  </div>
</template>

<script setup>
import DataDisplayBadgePublishStatus from '~/components/data/display/row/data-display-badge-publish-status'
import badge from '~/components/elements/badges/badge'

// Prepare props
const $props = defineProps({
  titleKey: {
    type: String,
    default: 'title'
  },
  descriptionKey: {
    type: String,
    default: 'description'
  },
  value: {
    type: Object,
    default: () => ({})
  }
})

// Prepare computed
const title = computed(() => $props.value[$props.titleKey])
const description = computed(() => $props.value[$props.descriptionKey])
const status = computed(() => $props.value.status)
</script>
