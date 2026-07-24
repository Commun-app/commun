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
        :class="{ 'ring-gray-50 border-gray-900':display && !readOnly, 'bg-gray-50 text-gray-500 ring-gray-200': readOnly }"
        class="relative w-full rounded-md pl-3 pr-10 py-2 text-left cursor-pointer shadow-xs border border-gray-200 focus:outline-none text-sm"
        @click="_toggle"
      >
        <span :class="{ 'text-gray-700':!selectionText }" class="block truncate">
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
          ref="selectCollectionEnum"
          class="absolute mt-1 w-full rounded-md bg-white shadow-lg z-50"
        >
          <ul tabindex="-1" role="listbox" aria-labelledby="listbox-label" aria-activedescendant="listbox-item-3" class="max-h-60 rounded-md p-2 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
            <li
              v-for="(option, i) in list"
              :id="`listbox-item-${i}`"
              :key="option"
              :class="readOnly ? 'cursor-not-allowed text-gray-300' : 'cursor-pointer text-black'"
              class=" select-none rounded-sm relative py-2 px-4 hover:bg-gray-50"
              role="option"
              @click="!readOnly && _select(option)"
            >
              <span :class="{ 'font-normal text-black': _isSelected(option) }" class="font-light block truncate">
                {{ option }}
              </span>
              <span
                v-show="_isSelected(option)"
                class="absolute text-black inset-y-0 right-0 flex items-center pr-4"
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
  attribute: {
    type: String,
    default: ''
  },
  filter: {
    type: Function,
    default: () => () => true
  },
  itemKey: {
    type: String,
    default: 'label'
  },
  itemValue: {
    type: String,
    default: 'id'
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
  readOnly: {
    type: Boolean,
    default: false
  },
  placeHolder: {
    type: String,
    default: 'Sélectionnez'
  },
  value: {
    type: [String, Array],
    default: ''
  }
})

// Prepare reactive data
const items = ref([])
const display = ref(false)
const selection = ref('')
const selectCollectionEnum = ref(null)

// Prepare computed
const list = computed(() => {
  const list = items.value.filter($props.filter)
  if ($props.object) {
    return list.map(item => item[$props.itemKey])
  }
  return list
})
const selectionText = computed(() => {
  if ($props.object) {
    return items.value.filter(item => _isSelected(item[$props.itemKey])).map(item => item[$props.itemKey]).join(', ')
  }
  return $props.enableMultiple ? selection.value.join(', ') : selection.value
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
  ? items.value.find(item => item[$props.itemKey] === option)?.[$props.itemValue]
  : option
  return $props.enableMultiple ? selection.value.includes(val) : selection.value === val
}
const _select = (option) => {
  let val = option
  if ($props.object) {
    const { [$props.itemValue]: objectVal } = items.value.find(({ [$props.itemKey]: val }) => val === option)
    val = objectVal
  }
  if ($props.enableMultiple) {
    const index = selection.value.indexOf(val)
    selection.value = index >= 0 ? selection.value.filter(check => check !== val) : [...selection.value, val]
  } else {
    selection.vale = val
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

// Prepare mounted
onMounted(() => {
  const { Collection } = useModels()
  const $route = useRoute()
  const collectionRecord = Collection.repo.where('slug', $route.params.collection).first()
  const { options } = collectionRecord.attributes.find(({ name }) => name === $props.attribute)
  items.value = options.items
})

// Prepare directives
onClickOutside(selectCollectionEnum, _close)
</script>
