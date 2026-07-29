<template>
  <div
    :style="border ? `border-color: ${background};` : `background-color: ${background}; color: ${_textColor(background)};`"
    class="relative inline-flex items-center text-xs h-6 font-light px-2 py-0.5 rounded-full text-gray-900 border border-white"
    :class="{ 'pl-5':dot }"
    @click="$emitters('click', title)"
  >
    <span
      v-show="dot"
      class="absolute h-2 w-2 left-2 rounded-full"
      :style="`background-color: ${background}`"
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
const $props = defineProps({
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
    default: ''
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

// Thématique sans couleur (ou blanche) : repli sur un gris neutre lisible au
// lieu d'une pastille blanche invisible (upgrade-admin-nuxt4).
const FALLBACK_COLOR = '#e5e7eb'
const background = computed(() => {
  const color = ($props.color || '').trim()
  return !color || ['#ffffff', '#fff', 'white'].includes(color.toLowerCase())
    ? FALLBACK_COLOR
    : color
})

// prepare methods
const _textColor = (backgroundColor) => {
  // hex (#rgb / #rrggbb) OU rgb() — l'ancien parseur ne lisait que rgb() et
  // rendait du texte illisible sur les couleurs claires exprimées en hex.
  let rgb
  const hex = backgroundColor?.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1]
  if (hex) {
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
    rgb = [full.slice(0, 2), full.slice(2, 4), full.slice(4, 6)].map((part) => parseInt(part, 16))
  } else {
    rgb = backgroundColor?.match(/\d+/g)?.map(Number)
  }

  if (!rgb || rgb.length < 3) {
    return '#000'
  }

  // Calculate the relative luminance using the formula
  // (source: https://www.w3.org/TR/WCAG20/#relativeluminancedef)
  const luminance = (rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114) / 255;

  // Return white (#fff) or black (#000) based on the contrast ratio
  return luminance > 0.5 ? '#000' : '#fff';
}
</script>
