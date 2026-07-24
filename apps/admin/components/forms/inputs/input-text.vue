<template>
  <div>
    <label
      :for="name"
      class="block text-2xs font-light tracking-wider text-gray-500 uppercase"
    >
      {{ label }}
    </label>
    <div :class="{ 'mt-1':!!label }" class="relative block w-full">
      <div v-if="icon" class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            :d="icon"
          />
        </svg>
      </div>
      <input
        :id="name"
        v-model="inputValue"
        :name="name"
        :autocomplete="autoComplete"
        :placeholder="placeHolder"
        :class="{ 'pl-10':!!icon }"
        :type="type"
        :required="required"
        :disabled="readOnly"
        class="w-full rounded-md shadow-xs border border-gray-200 sm:text-sm py-2 px-3 focus:outline-none focus:ring-gray-50 focus:border-black disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200"
        @keyup.enter="$emitters('enter')"
      >
      <!-- <p v-show="slugPreview" class="mt-1 ml-3 text-sm font-light text-gray-500">
        Aperçu dans l'url {{ slugifyValue(data) }}
      </p> -->
    </div>
  </div>
</template>

<script setup>
// import slugify from 'slugify'
// const slugifyOptions = {
//   replacement: '-',
//   lower: true,
//   locale: 'fr',
//   trim: true
// }

// Prepare $props
const $props = defineProps({
  autoComplete: {
    type: String,
    default: 'given-name'
  },
  label: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    default: 'input'
  },
  type: {
    type: String,
    default: 'text'
  },
  icon: {
    type: String,
    default: ''
  },
  placeHolder: {
    type: String,
    default: ''
  },
  value: {
    type: String,
    default: ''
  },
  readOnly: {
    type: Boolean,
    default: false
  },
  required: {
    type: Boolean,
    default: false
  },
  slugPreview: {
    type: Boolean,
    default: false
  }
})

// Prepare $emitters
const $emitters = defineEmits(['keyup.enter', 'change'])

// Prepare reactive $data
const inputValue = ref('')

// Prepare $watchers
watch(
  () => $props.value,
  (newValue) => {
    if (newValue !== inputValue.value) {
      inputValue.value = newValue
    }
  },
  { immediate: true }
)
watch(
  inputValue,
  (newValue) => $emitters('change', newValue)
)

// Prepare methods
// const _slugify = (value) => slugify(value, slugifyOptions)
</script>
