<template>
  <div class="relative block w-full">
    <button-secondary class="my-1" label="Ajouter une thématique" @click="_openModalForm('add')" />
    <!-- <list-table
      :headers="TABLES_HEADERS"
      :items="items"
      :actions="['update', 'remove']"
      @update="_openModalForm('update', $event)"
      @remove="_handleRecord('remove', $event)"
    /> -->
    <!-- TODO: replace by data-list-table? -->
    <data-list :items="items" :density="1" :density-children="1" :group-by="'directParent'" :item-value="'_id'" class="space-y-8">
      <template #item="{ item }">
        <data-list-row
          :item="item"
          :headers="ROW_DEFINITION"
          @click="_openModalForm('update', item)"
          class="mb-2 py-1 border-b border-b-gray-200 rounded-t-md"
        />
      </template>
      <template #item-child="{ item: itemChild, isStart, isLast }">
        <data-list-row
          :item="itemChild"
          :headers="ROW_DEFINITION"
          @click="_openModalForm('update', itemChild)"
          :class="{ 'rounded-t-md': isStart, 'rounded-b-md': isLast }"
          class="py-0.5"
        />
      </template>
    </data-list>
  </div>
</template>

<script setup>
import dataList from '~/components/data/lists/data-list'
import dataListRow from '~/components/data/display/row'
import buttonSecondary from '~/components/elements/buttons/secondary'
import { useModalStore } from '~/store/layout/modal'

const { Collection, Record } = useModels()
const { open } = useModalStore()

// Prepare constants
const ROW_DEFINITION = [
  {
    property: '_id',
    alignleft: true,
    component: 'data-label'
  },
  {
    component: 'data-spacer',
    grow: true
  },
  {
    nestedValue: false,
    alignRight: true,
    component: 'data-last-update',
    componentOptions: {
      inline: true
    }
  },
  {
    title: '',
    component: 'actions',
    componentOptions: {
      options: [
        { label: 'Modifier', action: 'update' },
        { label: 'Supprimer', action: 'remove' }
      ]
    }
  }
]

// Prepare props
const $props = defineProps({
  collection: {
    type: String,
    default: ''
  },
  alwaysPublished: {
    type: Boolean,
    default: false
  }
})

// Prepare computed
const items = computed(() => {
  const items = Record.repo.where('relatedCollection', $props.collection).get()
  // atm. we use .map(onRetrieve) directly in page & components, it should be better to have this
  // handled directly in `pinia-orm` lib
  return items.map(Record.onRetrieve)
})
const collectionAttributes = computed(() => {
  const collectionRecords = Collection.repo.all()
  return collectionRecords.find(({ slug }) => slug === $props.collection)?.editor?.componentOptions?.layout?.[0]?.sections?.[0]?.componentOptions?.attributes || []
})

// Prepare methods
const _handleRecord = async (action, data = {}) => {
  const { _id } = data
  if ($props.alwaysPublished) {
    data.status = 'published'
  }
  switch (action) {
    case 'add':
      await Record.create(data, $props.collection)
      break
    case 'update':
      await Record.update(_id, data, $props.collection)
      break
    case 'remove':
      await Record.remove(_id, $props.collection)
      break
    default:
      throw new Error('E_UNHANDLED')
  }
}
const _openModalForm = (action, record) => {
  open({
    onSubmit: async (data) => _handleRecord(action, data),
    details: {
      title: `${action === 'add' ? 'Créer' : 'Modifier'} une thématique`,
      subTitle: 'Entrez un nom pour votre thématique afin de l\'identifier facilement.',
      acceptButton: `${action === 'add' ? 'Créer' : 'Modifier'}`,
      closeButton: 'Annuler'
    },
    attributes: collectionAttributes.value,
    record
  })
}

// Prepare lifecyle hooks
onMounted(async () => {
  if (!items.value.length) {
    await Record.list($props.collection)
  }
})
</script>
