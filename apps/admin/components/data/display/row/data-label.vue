<template>
  <div>
    <badge
      v-for="({ _id, title, color, icon }) in records"
      :key="_id"
      :title="title"
      :color="color"
      :icon="icon"
      @click="$emitters('click', title)"
    />
  </div>
</template>

<script setup>
import badge from '~/components/elements/badges/badge'

const { Record } = useModels()

// Prepare emitters
const $emitters = defineEmits(['click'])

// Prepare props
const $props = defineProps({
  value: {
    type: [String, Array],
    default: () => []
  }
})

// Prepare computed
const records = computed(() => {
  if (!Array.isArray($props.value)) {
    return [Record.onRetrieve(Record.repo.find($props.value))]
  }
  return Record.repo.find($props.value).map(Record.onRetrieve)
})
</script>
