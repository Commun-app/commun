<template>
  <li class="relative group">
    <div
      class="h-48 min-h-full w-full border border-gray-100 rounded-md shadow hover:border-gray-300"
    >
      <div v-if="!readOnly" class="absolute flex items-center justify-center right-0 top-0 p-1 mr-2 mt-2 rounded hover:bg-gray-300">
        <dots-dropdown class="w-full h-full" :options="DOTS_ACTIONS" @action="_remove" />
      </div>
      <media-image v-if="media && mime.includes('image')" :media-id="value" class="object-cover object-center w-full h-full pointer-events-none !m-0" />
      <p class="h-full w-full flex items-center justify-center text-gray-500" v-else>
        {{ media?.originalName || 'Média non trouvé' }}
      </p>
    </div>
    <!-- <div
      v-else
      class="flex items-center w-full h-full bg-gray-100 border border-gray-400 rounded text-center group-hover:border-black focus:outline-none"
    >
      <div v-if="!readOnly" class="absolute flex items-center justify-center right-0 top-0 p-1 mr-2 mt-2 rounded hover:bg-gray-300">
        <dots-dropdown class="w-full h-full" :options="DOTS_ACTIONS" @remove="_remove" />
      </div>
      <media-image v-if="mime.includes('image')" :media-id="value" class="object-none object-center w-48 h-24 pointer-events-none !m-" />
      <span class="pl-4 text-xs text-gray-900">
        {{ name }}
      </span>
    </div> -->
  </li>
</template>

<script setup>
// import { Icon } from '@iconify/vue2'
import dotsDropdown from '@/components/elements/dropdowns/dots'
import mediaImage from '@/components/elements/media/image'

const { Media } = useModels()

// Prepare constants
const DOTS_ACTIONS = [
  {
    label: 'Supprimer',
    action: 'remove'
  }
]

// Prepare
const $emitters = defineEmits(['remove'])

// Prepare props
const $props = defineProps({
  value: {
    type: String,
    default: ''
  },
  fullWidth: {
    type: Boolean,
    default: false
  },
  readOnly: {
    type: Boolean,
    default: false
  }
})

// Prepare reactive data
const media = ref(undefined)

// Prepare computed
const mime = computed(() => media.value?.mime)

// Prepare methods
const _getMediaRecord = async (_id) => {
  let data
  [data] = Media.repo.query().where('_id', _id).get()
  if (!data) {
    (data = await Media.read(_id))
  }
  media.value = data
}
// TODO: refactor here to handle media edition
const _remove = (action) => {
  if (action === 'remove') {
    $emitters('remove')
  }
}

// Prepare watchers
watch(
  () => $props.value,
  async (newValue) => {
    if (newValue) {
      await _getMediaRecord(newValue)
    }
  },
  { immediate: true }
)
</script>
