import { defineStore } from 'pinia'

const DEFAULT_FN = () => true

export const useModalStore = defineStore('layout/modal', () => {
  // State
  const _display = ref(false)
  const _attributes = ref([])
  const _details = ref({})
  const _record = ref({})
  const _updateRecord = ref({})
  const _onSubmit = ref(DEFAULT_FN)

  // Getters
  const isEditing = computed(() => Object.keys(_record.value).includes('_id'))
  const display = computed(() => _display.value)
  const attributes = computed(() => _attributes.value)
  const record = computed(() => _record.value)
  const updatedRecord = computed(() => _updateRecord.value)
  const title = computed(() => _details.value?.title)
  const subTitle = computed(() => _details.value?.subTitle)
  const closeButton = computed(() => _details.value?.closeButton || 'Fermer')
  const acceptButton = computed(() => _details.value?.acceptButton || 'Créer')

  // Actions
  function open(data = { details: {}, record: {}, attributes: [] }) {
    console.log('[MODAL] - open')
    _details.value = { ...data.details }
    _record.value = { ...data.record }
    _updateRecord.value = { ...data.record }
    _attributes.value = [...data.attributes]
    _onSubmit.value = data.onSubmit || DEFAULT_FN
    _display.value = true
  }
  function close () {
    console.log('[MODAL] - close')
    _details.value = {}
    _record.value = {}
    _updateRecord.value = {}
    _attributes.value = []
    _onSubmit.value = DEFAULT_FN
    _display.value = false
  }
  function updateRecord(data) {
    console.log('[MODAL] - updating value...')
    _updateRecord.value = data
  }
  async function submit () {
    console.log('[MODAL] - submiting...')
    await _onSubmit.value({ ...updatedRecord.value })
    close()
  }

  return {
    isEditing,
    display,
    attributes,
    record,
    updateRecord,
    title,
    subTitle,
    closeButton,
    acceptButton,
    open,
    close,
    submit
  }
})

