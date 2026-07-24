<template>
  <div class="inline-flex">
    <input-toggle :value="value" @change="$emit('change', $event)" />
  </div>
</template>

<script setup>
import inputToggle from '~/components/forms/inputs/input-toggle'

defineProps({
  value: {
    type: Boolean,
    default: false
  }
})
</script>
