<template>
  <div class="text-sm cursor-pointer max-w-sm" @click="$emit('click')">
    {{ value }}
  </div>
</template>

<script setup>
defineProps({
  value: {
    type: String,
    default: ''
  }
})
</script>
