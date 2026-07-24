<template>
  <div class="relative block w-full">
    <label
      v-if="label"
      id="listbox-label"
      class="block text-2xs font-light tracking-wider text-gray-500 uppercase"
    >
      {{ label }}
    </label>
    <div class="grid grid-cols-5 space-x-2 mb-2" :class="{ 'mt-1': label }">
      <div class="inline-flex col-span-4 space-x-1">
        <select-enum
          :items="organizations"
          :value="currentOrganization"
          place-holder="Organisation"
          class="w-full"
          @change="currentOrganization = $event"
        />
        <select-enum
          :items="roles"
          :value="currentRole"
          :item-key="'name'"
          :read-only="!currentOrganization"
          place-holder="Role"
          class="w-full"
          @change="currentRole = $event"
        />
        <select-enum
          :items="collections"
          :value="currentCollections"
          :read-only="!currentOrganization || !currentRole"
          place-holder="Collection(s)"
          class="w-full"
          enable-multiple
          @change="currentCollections = $event"
        />
      </div>
      <button-secondary class="col-span-1" label="Ajouter un rôle" @click="_addRole" />
      <!-- @click="_openModalForm('add')" -->
    </div>
    <list-table
      :headers="TABLE_HEADERS"
      :items="selection"
      :actions="['remove']"
      class="bg-gray-100 p-2"
      @remove="_removeRole"
    />
    <!-- @update="_openModalForm('update', $event)"
    @remove="_handle('remove', $event)" -->
  </div>
</template>

<script setup>
import { computedAsync } from '@vueuse/core'
import listTable from '~/components/data/lists/data-lists-table'
import selectEnum from '~/components/forms/selects/select-enum'
import buttonSecondary from '~/components/elements/buttons/secondary'

// Prepare composable
const { Organization, Role, Collection } = useModels()

// Prepare constants
const TABLE_HEADERS = [
  {
    title: 'Organisation',
    nestedValue: false,
    component: 'data-summary',
    componentOptions: {
      titleKey: 'organization',
      descriptionKey: 'role',
    }
  },
  {
    property: 'collections',
    component: 'data-text'
  },
  {
    component: 'data-spacer',
    grow: true
  },
  {
    title: '',
    component: 'actions',
    componentOptions: {
      options: [
        { label: 'Supprimer', action: 'remove' }
      ]
    }
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

// Prepare data
const selection = ref([])
const currentOrganization = ref(null)
const currentRole = ref(null)
const currentCollections = ref([])

// Prepare computed
const organizations = computed(() => Organization.repo.all())
const roles = computed(() => Role.repo.all())
const collections = computedAsync(
  async () => {
    if (currentOrganization.value) {
      const collections = await Collection.list(undefined, currentOrganization.value)
      console.log(collections)
      return [{ _id: '*', name: 'Toutes les collections (*)'}, ...collections]
    }
    return []
  },
  [],
)


// Prepare methods
const _addRole = () => {
  selection.value.push({
    organization: currentOrganization.value,
    role: currentRole.value,
    collections: currentCollections.value
  })
  currentOrganization.value = null
  currentRole.value = null
  currentCollections.value = []
}
const _removeRole = (val) => {
  const indexToRemove = selection.value.findIndex(
    ({ organization, collections, role }) =>organization === val.organization
      && role === val.role
      && val.collections.every((_id) => collections.includes(_id))
  )
  if (indexToRemove >= 0) {
    selection.value.splice(indexToRemove, 1)
  }
}

// prepare watchers
watch(
  () => $props.value,
  (newValue) => {
    if (newValue) {
      selection.value = newValue
    }
  },
  { immediate: true }
)
watch(
  selection,
  (newValue) => $emitters('change', newValue),
  { immediate: true }
)

// Prepare lifecycle hook
onMounted(async () => {
  if (!roles.value.length) {
    await Role.list()
  }
  if (!organizations.value.length) {
    await Organization.list()
  }
})
</script>
