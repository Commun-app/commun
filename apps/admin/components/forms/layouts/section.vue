<template>
  <form class="border border-gray-200 sm:rounded-md" @submit.prevent="">
    <div class="py-6 px-4 space-y-6 sm:p-6">
      <div>
        <h3 v-show="title" class="text-lg leading-6 font-medium text-gray-900">
          {{ title }}
        </h3>
        <p v-show="description" class="mt-1 text-sm text-gray-500">
          {{ description }}
        </p>
      </div>
      <form-default
        v-if="attributes.length"
        :record="record"
        :attributes="attributes"
        :loading="isLoading"
        @change="updateRecord = $event"
      />
    </div>
    <div
      v-show="hint || (attributes.length && !noAction)"
      class="flex flex-row items-center px-4 py-3 bg-gray-50 border-t border-gray-200 text-right sm:px-6"
      :class="hint ? 'justify-between' : 'justify-end'"
    >
      <p v-show="hint" class="text-sm text-gray-600">
        {{ hint }}
      </p>
      <button-primary
        v-show="attributes.length && !noAction"
        :label="formButtonLabel"
        :loading="isLoading"
        @click="_save"
      />
    </div>
  </form>
</template>

<script setup>
import { useNotificationsStore } from '~/store/layout/notifications'
import formDefault from '~/components/forms/layouts/form'
import buttonPrimary from '~/components/elements/buttons/primary'

const $models = useModels()
const $route = useRoute()
const $router = useRouter()
const notificationsStore = useNotificationsStore()

// Prepare emits
const $emitters = defineEmits(['change'])

// Define props
const $props = defineProps({
  record: {
    type: Object,
    default: () => ({})
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  attributes: {
    type: Array,
    default: () => []
  },
  hint: {
    type: String,
    default: ''
  },
  formButtonLabel: {
    type: String,
    default: 'Enregistrer'
  },
  noAction: {
    type: Boolean,
    default: false
  }
})

// Prepare reactive data
const isLoading = ref(false)
const updateRecord = ref({})

// Prepare computed
const isEditing = computed(() => Object.keys($props.record).includes('_id'))
const currentCollection = computed(() => $route.params.collection)
const currentModel = computed(() => $route.meta.preFetch?.[0])

// Prepare methods
const _save = async () => {
  if (!$props.noAction) {
    isLoading.value = true
    try {
      const { _id, ...record } = updateRecord.value
      if (isEditing.value) {
        await $models[currentModel.value].update($props.record._id, record, currentCollection.value)
      } else {
        const data = await $models[currentModel.value].create(record, currentCollection.value)
        if (!isEditing.value) {
          const splittedRoute = $route.path.split('/')
          splittedRoute.pop()
          $router.replace([...splittedRoute, data._id].join('/'))
        }
      }
      notificationsStore.add({ title: `${$props.title} à jour` })
    } catch (err) {
      console.log(err)
    } finally {
      setTimeout(() => { isLoading.value = false }, 500)
    }
  } else {
    $emitters('change', updateRecord.value)
  }
}
</script>
