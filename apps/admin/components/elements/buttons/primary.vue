<template>
  <button
    :type="type"
    :disabled="loading"
    class="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm text-white dark:text-black bg-black dark:bg-white hover:bg-white dark:hover:bg-gray-950 hover:text-black dark:hover:text-white focus:outline-none hover:border-black dark:hover:border-gray-700 disabled:bg-gray-200 disabled:border-gray-300 disabled:text-gray-400"
    @click="$emit('click')"
  >
    <icon v-if="loading" icon="ei:spinner-2" class="animate-spin h-6 w-6 mr-1" />
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
  loading: {
    type: Boolean,
    default: false
  }
})

const $emit = defineEmits(['click'])
</script>
