<template>
  <img
    :src="originalUrl"
    :srcset="srcSetUrls"
    :alt="name"
  >
</template>

<script setup>
// import { Icon } from '@iconify/vue2'
import { computedAsync } from '@vueuse/core'
import axios from 'axios'

const { Media } = useModels()

// Prepare props
const $props = defineProps({
  organization: {
    type: String,
    default: ''
  },
  mediaId: {
    type: String,
    default: ''
  }
})

// Prepare reactive data
const media = ref(undefined)

// Prepare computed
const name = computed(() => media.value?.name)
const originalUrl = computed(() => media.value?.objects?.original)
const srcSetUrls = computedAsync(async () => {
  const filteredUrls = [];
  const objects = media.value?.objects || {};

  for (const [key, url] of Object.entries(objects)) {
    if (!key.includes('original') && !key.includes('thumb')) {
      try {
        // Perform a GET request on the URL to ensure file exist
        await axios({
          method: 'GET',
          url,
          headers: {
            'Range': 'bytes=0-0'
          }
        })

        const [, width] = key.split('-');
        filteredUrls.push(`${url} ${width}w`)
      } catch (err) {
        console.log('Media thumb does not exist yet.')
      }
    }
  }

  return filteredUrls.join(', ');
});

// Prepare methods
const _getMediaRecord = async (_id) => {
  let data
  [data] = Media.repo.query().where('_id', _id).get()
  console.log(data)
  if (!data) {
    (data = await Media.read(_id, undefined, $props.organization))
  }
  media.value = data
}

// Prepare watchers
watch(
  () => $props.mediaId,
  async (newValue) => {
    if (newValue) {
      await _getMediaRecord(newValue)
    }
  },
  { immediate: true }
)
</script>
