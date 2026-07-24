<template>
  <div class="flex flex-col space-y-1 py-1 items-start justify-center text-sm cursor-pointer" @click="$emit('click')">
    <data-display-badge-publish-status :status="status" class="sm:hidden" />
    <div class="flex items-center space-x-2">
      <p class="font-normal xs:w-60 truncate sm:min-w-0">
        {{ title }}
      </p>
      <data-display-badge-publish-status :status="status" class="hidden sm:inline-flex" />
    </div>
    <p class="hidden sm:block font-light text-gray-500">
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
