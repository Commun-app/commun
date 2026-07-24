<template>
  <div v-if="options.length" class="relative inline-block text-left">
    <button
      id="options-menu"
      class="rounded-full flex items-center focus:outline-none cursor-pointer"
      aria-haspopup="true"
      aria-expanded="true"
      @click.prevent="_toggle"
    >
      <span class="sr-only">Open options</span>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
      </svg>
    </button>
    <transition
      enter-active-class="transition ease-out duration-100"
      enter-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="display"
        ref="dropdownDots"
        class="origin-top-right absolute right-0 mt-2 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10"
      >
        <div class="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
          <div
            v-for="({ label, action }) in options"
            :key="action"
            class="block px-4 pr-16 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
            role="menuitem"
            @click="_select(action)"
          >
            {{ label }}
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { onClickOutside } from '@vueuse/core'

defineProps({
  options: {
    type: Array,
    default: () => []
  }
})

// Prepare dynamic emitters
const $emitters = defineEmits(['action'])

// Prepare reactive data
const dropdownDots = ref(null)
const display = ref(false)

// Prepare methods
const _toggle = () => {
  display.value = !display.value
}
const _close = () => {
  display.value = false
}
const _select = (action) => {
  _close()
  $emitters('action', action)
}

// Prepare directives
onClickOutside(dropdownDots, _close)
</script>
