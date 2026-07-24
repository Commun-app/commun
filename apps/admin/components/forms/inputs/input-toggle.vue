<template>
  <li class="py-1 flex items-center justify-start">
    <button
      :class="{
        '!bg-black': selected,
        '!h-3 !w-6': small
      }"
      type="button"
      class="bg-gray-200 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
      :aria-pressed="selected"
      :aria-labelledby="`${name}-option-label`"
      :aria-describedby="`${name}-option-description`"
      @click="_toggle"
    >
      <span class="sr-only">{{ name }} setting</span>
      <span
        :class="{
          'translate-x-5': selected && !small,
          'translate-x-3 !-mr-0.5': selected && small,
          '!-ml-0.5': !selected && small,
          '!h-3 !w-3 -my-0.5': small
        }"
        aria-hidden="true"
        class="translate-x-0 pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
      >
        <span
          v-if="icon"
          :class="selected ? 'opacity-0 ease-out duration-100' : 'opacity-100 ease-in duration-200'"
          class="absolute inset-0 flex h-full w-full items-center justify-center transition-opacity"
          aria-hidden="true"
        >
          <svg class="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 12 12">
            <path d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <!-- Enabled: "", Not Enabled: "" -->
        <span
          v-if="icon"
          :class="{
            '!opacity-100 !ease-in !duration-200': selected,
          }"
          class="opacity-0 ease-out duration-100 absolute inset-0 flex h-full w-full items-center justify-center transition-opacity"
          aria-hidden="true"
        >
          <svg class="h-3 w-3 text-black" fill="currentColor" viewBox="0 0 12 12">
            <path d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z" />
          </svg>
        </span>
      </span>
    </button>
    <div v-if="label || description" class="ml-4 text-left">
      <p v-if="label" :id="`${name}-option-label`" class="block text-2xs font-light tracking-wider text-gray-500 uppercase">
        {{ label }}
      </p>
      <p v-if="description" :id="`${name}-option-description`" class="text-sm text-gray-900">
        {{ description }}
      </p>
    </div>
  </li>
</template>

<script setup>
// Prepare $emitters
const $emitters = defineEmits(['keyup.enter', 'change'])

// Prepare $props
const $props = defineProps({
  icon: {
    type: Boolean,
    default: true
  },
  label: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    default: 'input'
  },
  defaultValue: {
    type: Boolean,
    default: false
  },
  value: {
    type: [Boolean, Object],
    default: undefined
  },
  small: {
    type: Boolean,
    default: false
  },
})

// Prepare reactive data
const selected = ref(false)

// Prepare watchers
watch(
  () => $props.value,
  (newValue) => {
    selected.value = newValue
  },
  { immediate: true }
)
watch(
  selected,
  (newValue) => $emitters('change', newValue)
)

// Prepare methods
const _toggle = () => {
  selected.value = !selected.value
}

// Prepare lifecycle methods
onMounted(() => {
  if (typeof $props.value === 'undefined') {
    selected.value = $props.defaultValue
  }
})
</script>
