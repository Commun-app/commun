<template>
  <button
    :type="type"
    class="px-4 py-2 border border-gray-200 shadow-xs rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
    @click="$emit('click')"
  >
    <icon
      v-show="icon"
      :icon="icon"
      class="h-5 w-5 text-gray-700"
    />
    {{ label }}
  </button>
</template>

<script setup>
import { Icon } from '@iconify/vue'

defineProps({
  label: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'button'
  },
  icon: {
    type: String,
    default: ''
  }
})

const $emit = defineEmits(['click'])
</script>