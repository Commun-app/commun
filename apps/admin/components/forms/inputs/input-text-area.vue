<template>
  <div>
    <label
      :for="name"
      class="block text-2xs font-light tracking-wider text-gray-500 uppercase"
    >
      {{ label }}
    </label>
    <textarea
      :id="name"
      v-model="data"
      :name="name"
      :class="{ 'mt-1':!!label }"
      :placeholder="placeHolder"
      :disabled="readOnly"
      rows="3"
      class="w-full rounded-md py-2 px-3 shadow-xs border border-gray-200 focus:outline-none focus:ring-gray-50 focus:border-black sm:text-sm disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200"
    />
  </div>
</template>

<script setup>
// Prepare $emitters
const $emitters = defineEmits(['keyup.enter', 'change'])

// Prepare $props
const $props = defineProps({
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
  },
  readOnly: {
    type: Boolean,
    default: false
  }
})

// Prepare reactive data
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
</script>
