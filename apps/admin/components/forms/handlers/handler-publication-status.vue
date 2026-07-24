<template>
  <div class="relative">
    <div class="flex items-center w-36 text-left shadow-xs text-sm" @click="_toggle">
      <button
        class="focus:outline-none border border-black text-black block truncate cursor-default px-4 py-2 w-full rounded-l-md"
      >
        {{ actionLabel }}
      </button>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded="true"
        aria-labelledby="listbox-label"
        class="flex items-center p-2 rounded-r-md cursor-pointer bg-black focus:outline-none border border-black"
      >
        <svg class="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
    <transition
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="display"
        ref="publicationStatusHandler"
        class="absolute flex flex-col justify-center right-0 mt-1 p-4 space-y-2 w-64 rounded-md bg-white shadow-lg z-50"
      >
        <!-- <alert sort="info" :description="actionAlert" /> -->
        <!-- <ul tabindex="-1" role="listbox" aria-labelledby="listbox-label" aria-activedescendant="listbox-item-3" class="text-base overflow-auto focus:outline-none sm:text-sm">
          <li
            v-for="({ label, option }, i) in list"
            :id="`listbox-item-${i}`"
            :key="option"
            class="cursor-pointer select-none relative py-2 pl-4 pr-4 text-gray-900 hover:bg-gray-100"
            role="option"
            @click="_updateStatus(option)"
          >
            <span class="font-normal block truncate">
              {{ label }}
            </span>
          </li>
        </ul> -->
        <!-- si publish dans les permissions -->
        <tertiary-button
          v-if="status === 'draft'"
          :label="'Valider la ressource'"
          @click="_updateStatus('ready')"
        />
        <tertiary-button
          v-if="['draft', 'waiting'].includes(status)"
          :label="'Publier la ressource'"
          @click="_updateStatus('published')"
        />
        <primary-button
          :label="`${actionLabel} la ressource`"
          class="mt-1"
          @click="_updateStatus(actionTo)"
        />
      </div>
    </transition>
  </div>
</template>

<script setup>
import { onClickOutside } from '@vueuse/core'
// import alert from '~/components/template/content-section/Alert'
import primaryButton from '~/components/elements/buttons/primary'
import tertiaryButton from '~/components/elements/buttons/tertiary'

// Prepare props
const $props = defineProps({
  collection: {
    type: String,
    default: ''
  },
  model: {
    type: String,
    default: ''
  },
  record: {
    type: Object,
    default: () => ({})
  }
})

// Prepare emitters
const $emitters = defineEmits(['select', 'loaded', 'loading'])

// Prepare composables
const { Record } = useModels()

// Prepare constants
const STATUSES_LIST = [
  { label: 'Brouillon', option: 'draft' },
  { label: 'En cours de valiation', option: 'waiting' },
  { label: 'Prêt', option: 'ready' },
  // { label: '', option: 'scheduled' },
  { label: 'Publié', option: 'published' }
]
const STATUSES_ACTIONS = [
  {
    label: 'Soumettre',
    alert: 'Une fois soumise, cette ressource devra être validée avant publication.',
    from: 'draft',
    to: 'waiting'
  },
  {
    label: 'Valider',
    // ability: this.canValidate,
    alert: 'Une fois validée, cette ressource devra être publiée afin de la rendre disponible sur votre site web.',
    from: 'waiting',
    to: 'ready'
  },
  {
    label: 'Publier',
    // ability: this.canPublish,
    alert: 'Une fois publiée, cette ressource apparaîtré sur votre site web.',
    from: 'ready',
    to: 'published' // scheduled
  },
  // {
  //   label: '',
  // alert: '',
  //   from: 'scheduled',
  //   to: ''
  // },
  {
    label: 'Dé-publier',
    // ability: this.canPublish,
    alert: 'Attention, cette resource actuellement en ligné, une fois dé-publiée, cette ressource n\'apparaîtra plus sur votre site web.',
    from: 'published',
    to: 'ready'
  }
]

// Prepare data
const display = ref(false)
const publicationStatusHandler = ref(null)

// Prepare computed
const status = computed(() => $props.record?.status)
const actionLabel = computed(() => STATUSES_ACTIONS.find(({ from }) => from === status.value)?.label)
const actionAlert = computed(() => STATUSES_ACTIONS.find(({ from }) => from === status.value)?.alert)
const actionTo = computed(() => STATUSES_ACTIONS.find(({ from }) => from === status.value)?.to)
// const canValidate = computed(() => {
//   const { $auth, $props: { model } } = this
//   return $auth.hasScope('manage:all') || $auth.hasScope(`validate:${model.toLowerCase()}s`)
// })
// const canPublish = computed(() => {
//   const { $auth, $props: { model } } = this
//   return $auth.hasScope('manage:all') || $auth.hasScope(`publish:${model.toLowerCase()}s`)
// })

// Prepare methods
const _select = (option) => {
  let val = option
  if ($props.object) {
    const { [$props.itemValue]: objectVal } = $props.items.find(({ [$props.itemKey]: val }) => val === option)
    val = objectVal
  }
  _close()
  $emitters('select', val)
}

const _getLabel = (value) => {
  const { label = '' } = STATUSES_ACTIONS.find(({ from }) => from === value) || {}
  return label
}
const _updateStatus = async (status) => {
  $emitters('loading')
  const { _id } = $props.record
  try {
    await Record.update(_id, { status }, $props.collection)
  } catch (err) {
    console.log(err)
  } finally {
    // await this.$api[model].read(collection, _id)
    $emitters('loaded')
    _close()
  }
}
const _toggle = () => {
  display.value = !display.value
}
const _close = () => {
  display.value = false
}
// Prepare directives
onClickOutside(publicationStatusHandler, _close)
</script>
