<template>
  <div>
    <label
      v-if="label"
      id="listbox-label"
      class="block text-2xs font-light tracking-wider text-gray-500 uppercase"
    >
      {{ label }}
    </label>
    <div
      :class="{ 'mt-1':label }"
      class="relative"
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded="true"
        aria-labelledby="listbox-label"
        :class="{ 'ring-gray-50 border-gray-900':display, '!bg-gray-100 !text-gray-200': readOnly }"
        :disabled="readOnly"
        class="relative w-full bg-white rounded-md pl-3 pr-10 py-2 text-left cursor-pointer shadow-xs border border-gray-200 focus:outline-none focus:ring-gray-50 focus:border-black hover:border-black text-sm"
        @click="_toggle"
      >
        <span :class="{ 'text-gray-700':!selectionText, '!text-gray-400': readOnly }" class="block truncate">
          {{ selectionText || placeHolder }}
        </span>
        <span class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </span>
      </button>
      <transition
        leave-active-class="transition ease-in duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="display"
          ref="selectEnum"
          class="absolute mt-1 w-full rounded-md bg-white shadow-lg z-50"
        >
          <ul tabindex="-1" role="listbox" aria-labelledby="listbox-label" aria-activedescendant="listbox-item-3" class="max-h-60 rounded-md p-2 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
            <li
              v-for="(option, i) in list"
              :id="`listbox-item-${i}`"
              :key="option"
              class="cursor-default select-none rounded-md relative py-2 pl-4 pr-4 text-gray-900 hover:bg-gray-100"
              role="option"
              @click="_select(option)"
            >
              <span :class="{ 'font-semibold':_isSelected(option) }" class="font-normal block truncate">
                {{ option }}
              </span>
              <span
                v-show="_isSelected(option)"
                class="absolute text-gray-900 inset-y-0 right-0 flex items-center pr-4"
              >
                <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </span>
            </li>
          </ul>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { onClickOutside } from '@vueuse/core'

// Prepare $emitters
const $emitters = defineEmits(['change'])

// Prepare props
const $props = defineProps({
  filter: {
    type: Function,
    default: () => () => true
  },
  items: {
    type: Array,
    default: () => []
  },
  itemKey: {
    type: String,
    default: 'name'
  },
  itemValue: {
    type: String,
    default: '_id'
  },
  label: {
    type: String,
    default: ''
  },
  enableMultiple: {
    type: Boolean,
    default: false
  },
  object: {
    type: Boolean,
    default: true
  },
  placeHolder: {
    type: String,
    default: 'Sélectionnez'
  },
  readOnly: {
    type: Boolean,
    default: false
  },
  value: {
    type: [String, Array],
    default: ''
  }
})

// Prepare reactive data
const display = ref(false)
const selection = ref($props.enableMultiple ? [] : '')
const selectEnum = ref(null)

// Prepare computed
const list = computed(() => {
  const list = $props.items.filter($props.filter)
  if ($props.object) {
    return list.map(item => item[$props.itemKey])
  }
  return list
})
const selectionText = computed(() => {
  const selectedItems = $props.object
    ? $props.items.map(item => item[$props.itemKey]).filter(_isSelected)
    : selection.value

  return $props.enableMultiple ? selectedItems.join(', ') : $props.object ? selectedItems[0] : selectedItems
})

// Prepare watchers
watch(
  () => $props.value,
  (newValue) => {
    if (newValue) {
      selection.value = newValue
    } else {
      selection.value = $props.enableMultiple ? [] : ''
    }
  },
  { immediate: true }
)

// Prepare methods
const _isSelected = (option) => {
  const val = $props.object
  ? $props.items.find(item => item[$props.itemKey] === option)?.[$props.itemValue]
  : option
  return $props.enableMultiple ? selection.value.includes(val) : selection.value === val;
}
const _select = (option) => {
  let val = option
  if ($props.object) {
    const { [$props.itemValue]: objectVal } = $props.items.find(({ [$props.itemKey]: val }) => val === option)
    val = objectVal
  }
  if ($props.enableMultiple) {
    const index = selection.value?.indexOf(val)
    selection.value = index >= 0 ? selection.value.filter(check => check !== val) : [...selection.value, val]
  } else {
    selection.value = val
    _close()
  }
  $emitters('change', selection.value)
}
const _toggle = () => {
  display.value = !display.value
}
const _close = () => {
  display.value = false
}

// Prepare directives
onClickOutside(selectEnum, _close)
</script>
