<template>
  <div class="relative block w-full">
    <label v-if="label" id="listbox-label" class="block text-2xs font-light tracking-wider text-gray-500 uppercase">
      {{ label }}
    </label>
    <!-- <div class="bg-gray-200 text-gray-500 text-sm rounded-md w-full p-4">
      /!\ Navigation should be based on organization.collections array only<br>
      Collections that does not belong to organization can't be updated or deleted only enabled / disabled<br>
      Let user duplicate an existing collection for this organization only
    </div> -->
    <button-secondary class="my-1" label="Ajouter une étape" @click="_openModalForm('add')" />
    <list-table
      :headers="TABLE_HEADERS"
      :items="selection"
      :actions="['update', 'remove']"
      @update="_openModalForm('update', $event)"
      @remove="_handleStep('remove', $event)"
    />
  </div>
</template>

<script setup>
import listTable from '~/components/data/lists/data-lists-table'
import buttonSecondary from '~/components/elements/buttons/secondary'
import { useModalStore } from '~/store/layout/modal'

const { open } = useModalStore()

// prepare constants
const TABLE_HEADERS = [
  {
    title: 'Nom',
    property: 'name',
    component: 'data-text'
  },
  {
    title: 'Statut',
    property: 'status',
    component: 'data-text'
  },
  {
    title: '',
    component: 'actions'
  }
]

// Prepare props
const $props = defineProps({
  label: {
    type: String,
    default: ''
  },
  value: {
    type: Array,
    default: () => []
  }
})

// Prepare $emitters
const $emitters = defineEmits(['keyup.enter', 'change'])

// Prepare reactive data
const selection = ref([])

// Prepare methods
const _handleStep = async (action, data = {}) => {
  switch (action) {
    case 'add':
      selection.value.push({ ...data, _id: selection.value.length })
      break
    case 'update':
      selection.value[data._id] = data
      break
    case 'remove':
      selection.value.splice(data._id, 1)
      selection.value = selection.value.map((val, index) => ({ ...val, _id: index }))
      break
    default:
      throw new Error('E_UNHANDLED')
  }
}

const _openModalForm = (action, record) => {
  open({
    onSubmit: async (data) => _handleStep(action, { _id: record?._id, ...data }),
    details: {
      title: `${action === 'add' ? 'Créer' : 'Modifier'} une étape`,
      subTitle: 'Vous pouvez détailler votre étape ici.',
      acceptButton: `${action === 'add' ? 'Créer' : 'Modifier'}`,
      closeButton: 'Annuler'
    },
    attributes: [
      {
        property: 'name',
        componentOptions: {
          label: 'Titre de l\'étape',
          name: 'name'
        },
        component: 'input-text'
      },
      {
        property: 'description',
        componentOptions: {
          label: 'Description de l\'étape',
          name: 'description'
        },
        component: 'input-text-area'
      },
      {
        property: 'status',
        componentOptions: {
          label: 'Etat de l\'étape',
          name: 'status',
          items: ['Planifié', 'En cours', 'Réalisé'],
          object: false
        },
        component: 'select-enum'
      },
      {
        property: 'content',
        componentOptions: {
          label: 'Contenu de l\'étape',
          name: 'content'
        },
        component: 'input-wysiwyg'
      }
    ],
    record
  })
}

// prepare watchers
watch(
  () => $props.value,
  (newValue) => {
    if (newValue) {
      selection.value = newValue.map((val, index) => ({ _id: index, ...val }))
    }
  },
  { immediate: true }
)
watch(
  selection,
  (newValue) => $emitters('change', newValue),
  { immediate: true }
)
</script>
