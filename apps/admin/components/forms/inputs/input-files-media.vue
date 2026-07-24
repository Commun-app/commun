<template>
  <div>
    <label
      :for="name"
      class="block text-2xs font-light tracking-wider text-gray-500 uppercase"
    >
      {{ label }}
    </label>
    <ul
      :id="name"
      :name="name"
      :class="{ 'p-3': (limit !== 1 || !currentMedia.length), 'mt-1': !!label }"
      class="bg-gray-100 rounded-md"
    >
      <!-- <draggable
        :list="value"
        :disabled="readOnly"
        ghost-class="opacity-25"
        @start="dragging = true"
        @end="dragging = false"
      > -->
      <ul role="list" :class="{ 'grid grid-cols-2 grid-flow-row': limit !== 1 }">
        <li
          v-if="!readOnly && (limit === 0 || currentMedia.length < limit)"
          class="relative mt-1 col-span-2"
        >
          <div class="flex w-full justify-center rounded-md border-2 border-dashed border-gray-300 focus:outline-none px-6 pt-5 pb-6">
            <div class="space-y-1 text-center">
              <svg
                class="cursor-pointer mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <div class="flex text-sm text-gray-600">
                <label
                  for="file-upload"
                  class="relative cursor-pointer text-indigo-600 rounded-md font-medium focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:text-indigo-500"
                  @click="_uploadMedia"
                >
                  <span>Upload a file</span>
                  <input-files
                    ref="inputMedia"
                    class="sr-only"
                    :read-only="readOnly"
                    @loading="loading = true"
                    @loaded="loading = false"
                    @change="_handleUploadedFiles"
                  />
                </label>
                <p class="pl-1">
                  or drag and drop
                </p>
              </div>
              <p class="text-xs text-gray-500">
                PNG, JPG, GIF up to 10MB
              </p>
            </div>
          </div>
        </li>
        <media-card-editor
          v-for="(_id, i) in currentMedia"
          :key="_id"
          :value="_id"
          :read-only="readOnly"
          :full-width="limit === 1"
          :class="{ 'cursor-move':!readOnly, 'row-span-1': limit !== 1 && [1, currentMedia.length - 1].includes(i) }"
          class="row-span-3 h-full"
          @remove="_removeMedia(_id)"
        />
      </ul>
      <!-- </draggable> -->
    </ul>
  </div>
</template>

<script setup>
import inputFiles from '~/components/forms/inputs/input-files'
import mediaCardEditor from '~/components/forms/inputs/media-section/media-editor'

// Prepare emitters
const $emitters = defineEmits(['change'])

// Prepare props
const $props = defineProps({
  readOnly: {
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
  limit: {
    type: Number,
    default: 0
  },
  value: {
    type: [Array, String],
    default: () => []
  }
})

// Prepare reactive data
const dragging = ref(false)
const loaded = ref(false)
const initialValue = ref([])
const currentMedia = ref([])
const inputMedia = ref(null)

// Prepare watchers
watch(
  () => $props.value,
  (newValue) => {
    if (!currentMedia.value.length && (newValue && newValue.length)) {
      initialValue.value = Array.isArray(newValue) ? [...newValue] : [newValue]
      currentMedia.value = [...initialValue.value]
    }
  },
  { immediate: true }
)

// Prepare methods
const _uploadMedia = () => {
  inputMedia.value._handleClick()
}

const _removeMedia = (idToRemove) => {
  initialValue.value = initialValue.value.filter(_id => _id !== idToRemove)
  currentMedia.value = [...initialValue.value]
  $emitters('change', currentMedia.value.map(_id => _id))
}

const _handleUploadedFiles = (data = []) => {
  currentMedia.value = [...initialValue.value, ...data.map(({ _id }) => _id)]
  $emitters('change', currentMedia.value)
}
</script>
