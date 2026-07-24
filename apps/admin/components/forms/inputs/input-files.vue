<template>
  <div>
    <input
      ref="inputFile"
      type="file"
      class="sr-only"
      :accept="mime"
      :multiple="multiple"
      :disabled="readOnly"
      @change="_prepareUpload"
    >
  </div>
</template>

<script setup>
import axios from 'axios'

const { Media } = useModels()

// Prepare emitters
const $emitters = defineEmits(['loading', 'loaded', 'change', 'error'])

// Prepare props
defineProps({
  mime: {
    type: String,
    default: 'image/*,application/pdf'
  },
  multiple: {
    type: Boolean,
    default: false
  },
  readOnly: {
    type: Boolean,
    default: false
  }
})

// Prepare reactive data
const loading = ref(true)
const files = ref([])
const inputFile = ref(null)

// Prepare methods
const _handleClick = () => inputFile.value.click()

const _createMedia = async ({ name, mime, file }) => {
  // Request for S3 pre-signed url (le nom alimente la clé S3 côté Commun)
  const { _id, url } = await Media.getS3PreSignedUrl({ mime, name })

  // Put media on amazon S3
  await axios({
    method: 'PUT',
    url,
    data: file,
    headers: { 'Content-Type': mime }
  })

  // Inform object has been pushed
  const finalData = await Media.create({ _id, mime, name })
  return finalData
}

const _uploadFiles = async () => {
  const filesToUpload = files.value.filter(({ isUploaded }) => !isUploaded)
  if (filesToUpload && filesToUpload.length) {
    let i = (filesToUpload.length - 1)
    while (i >= 0) {
      const { file } = filesToUpload[i]
      const { name, type: mime } = file
      const mediaRecord = await _createMedia({ mime, name, file })
      files.value.pop()
      files.value.unshift({ ...mediaRecord, isUploaded: true })
      i--
    }
  }
}

const _prepareUpload = async () => {
  $emitters('loading')
  loading.value = true
  try {
    const list = Array.from(inputFile.value.files)
    list.forEach(file => files.value.push({ file, isUploaded: false }))
    await _uploadFiles()
    $emitters('change', files.value)
  } catch (err) {
    $emitters('error', err)
  } finally {
    loading.value = false
    $emitters('loaded')
  }
}

defineExpose({
  _handleClick
})
</script>
