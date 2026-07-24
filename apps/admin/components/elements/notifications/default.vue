<template>
  <div class="relative w-full pointer-events-auto p-4 bg-black text-white rounded-md shadow-xs ring-1 ring-gray-200 dark:ring-gray-800">
    <div class="flex flex-row items-start">
      <icon v-if="icon" :icon="icon" class="h-6 w-6 mr-1" />
      <p>
        {{ title }}
      </p>
    </div>
    <div class="absolute bottom-0 w-full end-0 start-0 bg-gray-800 rounded-b-md">
      <div v-if="timeout" class="h-1 bg-white rounded-bl-md" :style="progressStyle" />
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import useTimer from '~/composables/use-timer'

// Prepare props
const $props = defineProps({
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['default', 'info', 'warn', 'error'],
    default: 'default'
  },
  icon: {
    type: String,
    default: ''
  },
  closeButton: {
    type: Boolean,
    default: false
  },
  timeout: {
    type: Number,
    default: 6000
  },
  loader: {
    type: Boolean,
    default: false
  }
})

// Prepare emitters
const $emitters = defineEmits(['close'])

// Prepare reactive data
let timer = null
const remaining = ref($props.timeout)

// Prepare computed
const progressStyle = computed(() => {
  const remainingPercent = remaining.value / $props.timeout * 100

  return { width: `${remainingPercent || 0}%` }
})

// Prepare methods
const _onClose = () => {
  if (timer) {
    timer.stop()
  }
  $emitters('close')
}

// Prepare lifecycly hooks
onMounted(() => {
  if ($props.timeout) {
    timer = useTimer(_onClose, $props.timeout)

    watchEffect(() => {
      remaining.value = timer.remaining.value
    })
  }
})

onUnmounted(() => {
  if (timer) {
    timer.stop()
  }
})
</script>