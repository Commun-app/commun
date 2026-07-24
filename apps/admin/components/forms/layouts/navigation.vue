
<template>
  <nav class="space-y-1" aria-label="Sidebar">
    <div
      v-for="({ title }) in tabs"
      :key="title"
      :class="selection === title ? 'bg-gray-200 text-gray-900 font-normal' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-light'"
      class="flex items-center px-3 py-2 text-sm rounded-md cursor-pointer"
      @click="_select(title)"
    >
      <span class="truncate">
        {{ title }}
      </span>
    </div>
  </nav>
</template>

<script setup>
// Prepre emitters
const $emitters = defineEmits(['select'])

// Prepare props
const $props = defineProps({
  selection: {
    type: String,
    default: ''
  },
  tabs: {
    type: Array,
    default: () => []
  }
})

// Prepare methods
const _select = (tab) => {
  if (tab) {
    $emitters('select', tab)
  }
}

// Prepare mounted
onMounted(() => {
  if (!$props.selection) {
    const [{ title: first }] = $props.tabs
    _select(first)
  }
})
</script>
