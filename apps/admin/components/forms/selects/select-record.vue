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
      <input
        v-model="selectionText"
        id="combobox"
        type="text"
        role="combobox"
        aria-controls="options"
        aria-expanded="false"
        :class="{ 'ring-gray-50 border-gray-900':display }"
        :placeholder="placeHolder"
        class="w-full bg-white rounded-md pl-3 pr-10 py-2 h-10 text-left cursor-pointer shadow-xs border border-gray-200 focus:outline-none focus:ring-gray-50 focus:border-black hover:border-black text-sm"
        @keyup="_search"
        @click="_toggle"
      >
      <span class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </span>
      <transition
        leave-active-class="transition ease-in duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="display"
          ref="selectRecord"
          class="absolute mt-1 w-full rounded-md bg-white shadow-lg z-50"
        >
          <ul
            abindex="-1"
            role="listbox"
            aria-labelledby="listbox-label"
            aria-activedescendant="listbox-item-3"
            class="max-h-60 rounded-md py-2 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
          >
            <div v-if="groupByDirectParents">
              <div v-for="({ title, children }, i) in options" :key="i" class="p-2 space-y-1">
                <div class="border-b border-gray-200">
                  <p class="pb-4 pl-4 pr-4 text-gray-500 font-light uppercase text-xs">
                    {{ title }}
                  </p>
                </div>
                <li
                  v-for="({ title: childTitle }, j) in children"
                  :key="`${childTitle}-${j}`"
                  :class="{ 'bg-gray-100': _isSelected(childTitle) }"
                  class="cursor-pointer select-none relative rounded-md py-2 pl-4 pr-4 text-gray-900 hover:bg-gray-100"
                  @click="_select(childTitle)"
                >
                  <span :class="{ 'font-semibold':_isSelected(childTitle) }" class="font-normal block truncate">
                    {{ childTitle }}
                  </span>
                  <span
                    v-show="_isSelected(childTitle)"
                    class="absolute text-gray-900 inset-y-0 right-0 flex items-center pr-4"
                  >
                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                  </span>
                </li>
              </div>
            </div>
            <div v-else>
              <li
                v-for="({ title, relatedCollection }) in options"
                :key="title"
                :class="{ 'bg-gray-100': _isSelected(title) }"
                class="cursor-pointer select-none relative rounded-md py-2 pl-4 pr-4 text-gray-900 hover:bg-gray-100"
                @click="_select(title)"
              >
                <span :class="{ 'font-semibold':_isSelected(title) }" class="font-normal block truncate">
                  {{ title }}
                </span>
                <span class="font-normal text-gray-600 block truncate">
                  {{ relatedCollection }}
                </span>
                <span
                  v-show="_isSelected(title)"
                  class="absolute text-gray-900 inset-y-0 right-0 flex items-center pr-4"
                >
                  <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </span>
              </li>
            </div>
          </ul>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { onClickOutside } from '@vueuse/core'
import { useWorkspaceStore } from '~/store/layout/workspace'
import { useModalStore } from '~/store/layout/modal'

const { Record } = useModels()
const workspaceStore = useWorkspaceStore()

// Prepare emitters
const $emitters = defineEmits(['change'])

// Prepare props
const $props = defineProps({
  filter: {
    type: Function,
    default: () => () => true
  },
  onlyDirectParents: {
    type: Boolean,
    default: false
  },
  groupByDirectParents: {
    type: Boolean,
    default: false
  },
  collections: {
    type: Array,
    default: () => []
  },
  label: {
    type: String,
    default: ''
  },
  enableMultiple: {
    type: Boolean,
    default: false
  },
  placeHolder: {
    type: String,
    default: 'Rechercher...'
  },
  value: {
    type: [String, Array],
    default: ''
  }
})

// Prepare reactive data
const selectRecord = ref(null)
const display = ref(false)
const selection = ref('')
const search = ref('')

// Prepare computed
const items = computed(() => {
  const items = Record.repo
    .where((record) => $props.collections.includes(record.relatedCollection) && record.title.toLowerCase().includes(search.value))
    .get()

  // atm. we use onRetrieve directly in page, it should be better to have this
  // handled directly in `pinia-orm` lib
  return items.map(Record.onRetrieve)
})
const options = computed(() => {
  if ($props.groupByDirectParents) {
    return items.value
      .filter($props.filter)
      .filter(({ directParent }) => !directParent)
      .map(({ _id, ...rest }) => {
        const children = items.value
          .filter($props.filter)
          .filter(({ directParent }) => directParent === _id)

        return { children, ...rest }
      }, [])
  }
  if ($props.onlyDirectParents) {
    return items.value.filter($props.filter).filter(({ directParent }) => !directParent)
  }
  return items.value.filter($props.filter)
})
const selectionText = computed(() => {
  if (display.value || search.value) {
    return ''
  }
  if (selection.value) {
    if ($props.enableMultiple) {
      return selection.value
        .map(_id => items.value.find(({ _id: check }) => check === _id))
        .map((item) => item?.title)
        .join(', ')
    }
    const item = items.value.find(({ _id }) => selection.value === _id)
    return item?.title
  }
  return ''
})

// Prepare watchers
watch(
  () => $props.value,
  (newValue) => {
    if (!newValue || !newValue.length) {
      selection.value = $props.enableMultiple ? [] : ''
    }
    if (newValue && newValue.length && newValue !== selection.value) {
      if ($props.enableMultiple) {
        selection.value = newValue.every(el => typeof el === 'object')
          ? newValue.map(({ _id: value }) => value)
          : [...newValue]
      } else {
        selection.value = typeof newValue === 'object'
          ? newValue._id
          : newValue
      }
    }
  },
  { immediate: true }
)

// Prepare methods
const _isSelected = (option) => {
  const { _id } = items.value.find(({ title }) => title === option)
  if ($props.enableMultiple) {
    return selection.value.includes(_id)
  }
  return selection.value === _id
}

const _search = (str) => {
  search.value = str?.target?.value
}

const _toggle = () => {
  display.value = !display.value
  search.value = ''
}

const _close = () => {
  display.value = false
  search.value = ''
}

const _select = (option) => {
  const { _id } = items.value.find(({ title }) => title === option)
  if ($props.enableMultiple) {
    const index = selection.value.indexOf(_id)
    index >= 0 ? selection.value.splice(index, 1) : selection.value.push(_id)
  } else {
    selection.value = _id
    _close()
  }
  $emitters('change', selection.value)
}

// Prepare lifecycle hooks
onMounted(async () => {
  await Promise.all(
    $props.collections.map(
      (collection) => Record.list(collection, workspaceStore.workspaceId, { limit: 500 })
    )
  )
})

// Prepare directives
onClickOutside(selectRecord, _close)
</script>
