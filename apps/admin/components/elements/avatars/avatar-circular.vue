<template>
  <span
    class="relative inline-flex items-center justify-center rounded-full focus:outline-none border border-gray-100 text-white bg-black"
    :class="containerSize"
  >
    <media-image v-if="media" :media-id="media" :organization="organization" class="inline-block w-full h-full rounded-full" />
    <span v-else :class="textSize" class="leading-none">
      {{ initials }}
    </span>
  </span>
</template>

<script setup>
import mediaImage from '@/components/elements/media/image'

// Prepare props
const $props = defineProps({
  organization: {
    type: String,
    default: ''
  },
  media: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'xs'
  },
  placeHolder: {
    type: String,
    default: ''
  }
})

// Prepare computed data
const containerSize = computed(() => {
  const sizes = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-14 w-14',
    '2xl': 'h-16 w-16',
    '3xl': 'h-20 w-20',
    '4xl': 'h-24 w-24',
    '5xl': 'h-28 w-28',
    '6xl': 'h-32 w-32'
  }
  return sizes[$props.size]
})
const textSize = computed(() => {
  const sizes = {
    xs: 'text-2xs',
    sm: 'text-8',
    md: 'text-10',
    lg: 'text-12',
    xl: 'text-14',
    '2xl': 'text-16',
    '3xl': 'text-20',
    '4xl': 'text-24',
    '5xl': 'text-28',
    '6xl': 'text-32'
  }
  return sizes[$props.size]
})
const initials = computed(() => $props.placeHolder.match(/(\b\S)?/g).join('').match(/(^\S|\S$)?/g).join('').toUpperCase())
</script>
