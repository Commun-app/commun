<template>
  <badge :title="badgeTitle" :color="badgeColor" border dot />
</template>

<script setup>
import badge from '~/components/elements/badges/badge'

// Prepare constants
const PUBLICATION_STATUSES = [
  { label: 'Brouillon', color: '#e5e7eb', option: 'draft' },
  { label: 'A valider', color: '#facc15', option: 'waiting' },
  { label: 'Prêt', color: '#60a5fa', option: 'ready' },
  { label: 'Programmé', option: 'scheduled' },
  { label: 'Publié', color: '#34d399', option: 'published' }
]

// Prepare props
const $props = defineProps({
  status: {
    type: String,
    default: ''
  }
})

// Prepare computed
const correspondingStatus = computed(() => PUBLICATION_STATUSES.find(({ option }) => option === $props.status))
const badgeTitle = computed(() => correspondingStatus.value?.label)
const badgeColor = computed(() => correspondingStatus.value?.color)
</script>
