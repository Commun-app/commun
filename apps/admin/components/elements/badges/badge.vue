<template>
  <div
    :style="border ? `border-color: ${color};` : `background-color: ${color}; color: ${_textColor(color)};`"
    class="relative inline-flex items-center text-xs h-6 font-light px-2 py-0.5 rounded-full text-gray-900 border border-white"
    :class="{ 'pl-5':dot }"
    @click="$emitters('click', title)"
  >
    <span
      v-show="dot"
      class="absolute h-2 w-2 left-2 rounded-full"
      :style="`background-color: ${color}`"
    />
    <icon
      v-show="icon"
      :icon="icon"
      class="h-4 w-4 mr-2"
    />
    {{ title }}
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'

const $emitters = defineEmits(['click'])

// Prepare props
defineProps({
  dot: {
    type: Boolean,
    default: false
  },
  border: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: '#ffffff'
  },
  title: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  }
})

// prepare methods
const _textColor = (backgroundColor) => {
  // Convert the background color to RGB values
  const rgb = backgroundColor?.match(/\d+/g)?.map(Number)

  if (!rgb) {
    return '#000'
  }
  

  // Calculate the relative luminance using the formula
  // (source: https://www.w3.org/TR/WCAG20/#relativeluminancedef)
  const luminance = (rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114) / 255;

  // Return white (#fff) or black (#000) based on the contrast ratio
  return luminance > 0.5 ? '#000' : '#fff';
}
</script>
