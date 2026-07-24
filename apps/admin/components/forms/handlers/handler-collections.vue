<template>
  <div class="relative block w-full">
    <!-- <div class="bg-gray-200 text-gray-500 text-sm rounded-md w-full p-4">
      /!\ Navigation should be based on organization.collections array only<br>
      Collections that does not belong to organization can't be updated or deleted only enabled / disabled<br>
      Let user duplicate an existing collection for this organization only
    </div> -->
    <button-secondary class="my-1" label="Ajouter une collection" @click="_openModalForm('add')" />
    <list-table
      :headers="TABLE_HEADERS"
      :items="collections"
      :actions="['update', 'remove']"
      @update="_openModalForm('update', $event)"
      @remove="_handleCollection('remove', $event)"
      @usage="_updateCollectionUsage($event)"
    />
  </div>
</template>

<script setup>
import listTable from '~/components/data/lists/data-lists-table'
import buttonSecondary from '~/components/elements/buttons/secondary'
import { useModalStore } from '~/store/layout/modal'
import { useWorkspaceStore } from '~/store/layout/workspace'

const { Organization, Collection } = useModels()
const { open } = useModalStore()
const $workspaceStore = useWorkspaceStore()

// prepare constants
const TABLE_HEADERS = [
  {
    title: 'Utilisation',
    property: 'usage',
    component: 'data-toggle'
  },
  {
    title: 'Nom',
    property: 'name',
    component: 'data-text'
  },
  {
    title: 'Organisation',
    property: 'organization',
    component: 'data-badge'
  },
  {
    title: 'Dernière modification',
    nestedValue: false,
    alignRight: true,
    component: 'data-last-update',
    componentOptions: {
      inline: true
    }
  },
  {
    title: '',
    component: 'actions'
  }
]

// Prepare dynamic data
const availableCollections = ref([])

// Prepare computed
const organizationId = computed(() => $workspaceStore.workspaceId)
const organizationPath = computed(() => $workspaceStore.workspacePath)
const organizationCollections = computed(() => $workspaceStore.workspaceCollections)
const collections = computed(() => {
  const collectionRecords = Collection.repo.all()
  return collectionRecords.map(({ _id, ...rest }) => ({ _id, usage: organizationCollections.value.includes(_id), ...rest }))
})

// Prepare methods
const _updateCollectionUsage = async ({ _id, usage }) => {
  if (usage && !organizationCollections.value.includes(_id)) {
    await Organization.update(organizationId.value, { collections: [...organizationCollections.value, _id] })
  }
  if (!usage && organizationCollections.value.includes(_id)) {
    await Organization.update(organizationId.value, { collections: [...organizationCollections.value.filter(check => check !== _id)] })
  }
}

const _handleCollection = async (action, data = {}) => {
  const { _id } = data
  switch (action) {
    case 'add':
      await Collection.create(data)
      break
    case 'update':
      await Collection.update(_id, data)
      break
    case 'remove':
      await Collection.remove(_id)
      break
    default:
      throw new Error('E_UNHANDLED')
  }
}

const _openModalForm = (action, record) => {
  console.log(action, record)
  open({
    onSubmit: async (data) => _handleCollection(action, data),
    details: {
      title: `${action === 'add'? 'Créer' : 'Modifier'} une collection`,
      subTitle: 'Entrez un nom pour votre collection afin de l\'identifier facilement.',
      acceptButton: `${action === 'add' ? 'Créer' : 'Modifier'}`,
      closeButton: 'Annuler'
    },
    attributes: [
      {
        property: 'name',
        componentOptions: {
          label: 'Titre de la collection',
          name: 'name'
        },
        component: 'input-text'
      },
      {
        property: 'slug',
        componentOptions: {
          label: 'Slug de la collection',
          name: 'slug'
        },
        component: 'input-text'
      },
      {
        property: 'description',
        componentOptions: {
          label: 'Description de la collection',
          name: 'description'
        },
        component: 'input-text-area'
      },
      {
        property: 'attributes',
        componentOptions: {
          label: 'Attribut(s) de la collection',
          name: 'attributes'
        },
        component: 'input-json'
      },
      {
        property: 'editor',
        componentOptions: {
          label: 'Editeur de la collection',
          name: 'editor'
        },
        component: 'input-json'
      },
      {
        property: 'headings',
        componentOptions: {
          label: 'Titres de la collection',
          name: 'headings'
        },
        component: 'input-json'
      },
      {
        property: 'display',
        componentOptions: {
          label: 'Affichage de la collection',
          name: 'display'
        },
        component: 'input-json'
      }
    ],
    record
  })
}

// Prepare lifecyle hooks
onMounted(async () => {
  if (!collections.value.length) {
    await Collection.list()
  }
  if (!availableCollections.value.length) {
    const parents = organizationPath.value.split('/')
    if (parents.length) {
      parents.pop()
      const results = await Promise.all(
        parents.map(parent => Collection.list(undefined, parent))
      )
      availableCollections.value = results.flat()
    }
  }
})
</script>
