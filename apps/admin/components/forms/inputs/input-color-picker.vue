<template>
  <div class="relative">
    <label
      :for="name"
      class="block text-2xs font-light tracking-wider text-gray-500 uppercase"
    >
      {{ label }}
    </label>
    <div class="inline-flex items-center w-full space-x-2">
      <div class="relative mt-1 rounded-md shadow-sm">
        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <div class="h-5 w-5 mt-1 rounded-full bg-white" :style="`background-color: ${data}`" />
        </div>
        <input
          :id="name"
          v-model="data"
          :name="name"
          :class="{ 'mt-1':!!label }"
          :placeholder="placeHolder"
          :disabled="disabled"
          type="text"
          class="block w-full rounded-md py-2 px-3 pl-10 shadow-xs border border-gray-200 disabled:bg-gray-100 focus:outline-none focus:ring-gray-50 focus:border-black sm:text-sm"
          @keyup.enter="$emit('enter')"
        >
      </div>
      <button
        :class="{ 'mt-1':!!label }"
        class="border border-gray-200 w-auto h-full text-sm py-1.5 px-2 font-medium rounded-md text-gray-900 hover:text-black bg-transparent focus:outline-none focus:ring-gray-50 focus:border-black"
        @click="_toggle"
      >
        <svg
          class="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 26 26"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
          />
        </svg>
      </button>
    </div>
    <transition
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="display"
        ref="inputColorPicker"
        class="border border-gray-300 origin-top-right absolute right-0 top-full mt-2 rounded-md shadow-lg z-20"
      >
        <div class="rounded-md bg-white shadow-xs p-2">
          <div class="flex">
            <div v-for="(color, i) in COLORS" :key="i">
              <div
                v-for="variant in color"
                :key="variant"
                :style="`background-color: ${variant};`"
                class="cursor-pointer w-6 h-6 rounded-full mx-1 my-1"
                @click="_select(variant)"
              />
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { onClickOutside } from '@vueuse/core'

// Prepare constants
const COLORS = [
  ['#E2E8F0', '#64748B', '#1E293B'],
  ['#E5E7EB', '#6B7280', '#1F2937'],
  ['#FECACA', '#EF4444', '#991B1B'],
  ['#FED7AA', '#F97316', '#9A3412'],
  ['#FDE68A', '#F59E0B', '#92400E'],
  ['#FEF08A', '#EAB308', '#854D0E'],
  ['#D9F99D', '#84CC16', '#3F6212'],
  ['#BBF7D0', '#22C55E', '#166534'],
  ['#A7F3D0', '#10B981', '#065F46'],
  ['#99F6E4', '#14B8A6', '#115E59'],
  ['#A5F3FC', '#06B6D4', '#155E75'],
  ['#BAE6FD', '#0EA5E9', '#075985'],
  ['#BFDBFE', '#3B82F6', '#1E40AF'],
  ['#C7D2FE', '#6366F1', '#3730A3'],
  ['#DDD6FE', '#8B5CF6', '#5B21B6'],
  ['#E9D5FF', '#A855F7', '#6B21A8'],
  ['#F5D0FE', '#D946EF', '#86198F'],
  ['#FBCFE8', '#EC4899', '#9D174D'],
  ['#FECDD3', '#F43F5E', '#9F1239']
]

// Prepare $emitters
const $emitters = defineEmits(['change'])

// Prepare props
const $props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  },
  label: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    default: 'input'
  },
  placeHolder: {
    type: String,
    default: ''
  },
  value: {
    type: String,
    default: ''
  }
})

// Prepare reactive data
const inputColorPicker = ref(null)
const display = ref(false)
const data = ref('')

// Prepare watchers
watch(
  () => $props.value,
  (newValue) => {
    data.value = newValue
  },
  { immediate: true }
)
watch(
  data,
  (newValue) => $emitters('change', newValue)
)

// Prepare methods
const _toggle = () => {
  display.value = !display.value
}
const _close = () => {
  display.value = false
}
const _select = (color) => {
  data.value = color
  _close()
}
// Prepare directives
onClickOutside(inputColorPicker, _close)
</script>
