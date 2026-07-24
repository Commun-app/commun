<template>
  <button
    type="button"
    class="px-4 py-2 border border-transparent rounded-md text-sm text-gray-500 bg-white hover:underline hover:bg-white hover:text-black focus:outline-none"
    @click="$emit('click')"
  >
    {{ label }}
  </button>
</template>

<script setup>
defineProps({
  label: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'button'
  }
})

const $emit = defineEmits(['click'])
</script>

