<template>
  <div>
    <badge
      :title="badgeTitle"
      :color="badgeColor"
      :dot="false"
      :border="true"
      @click="$emitters('click')"
    />
  </div>
</template>

<script setup>
import badge from '~/components/elements/badges/badge'

// Prepare emitters
const $emitters = defineEmits(['click'])

// Prepare props
const $props = defineProps({
  color: {
    type: String,
    default: '#e5e7eb'
  },
  value: {
    type: [String, Object],
    default: ''
  }
})

// Prepare computed
const badgeTitle = computed(() => typeof $props.value === 'object' ? $props.value.name : $props.value)
const badgeColor = computed(() => typeof $props.value === 'object' ? $props.value.color :$props.color)
</script>
