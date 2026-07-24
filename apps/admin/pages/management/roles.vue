<template>
  <section class="w-full">
    <!-- Rôles figés par Commun (admin / rédacteur) : consultation seule. -->
    <p class="mb-6 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
      Les rôles sont désormais prédéfinis (administrateur, rédacteur) et ne sont plus personnalisables.
    </p>
    <default-table
      v-if="!$route.params.event"
      :headers="TABLE_HEADERS"
      :filters="filters"
      :items="records"
      :actions="abilities"
      :pagination-size="limit"
      display-search-bar
      paginated-content
      @fetch-more="_fetchMore"
      @update="_openModalForm('update', $event)"
      @remove="_handle('remove', $event)"
    />
  </section>
</template>

<script setup>
import buttonSecondary from '~/components/elements/buttons/secondary'
import defaultTable from '~/components/data/lists/data-lists-table'
import { useModalStore } from '~/store/layout/modal'

definePageMeta({
  permissions: ['manage:all'],
  preFetch: ['Role'],
  headings: {
    title: 'Membres',
    description: 'Retrouvez & managez ici toutes les membres de la plateforme.'
  }
})

const { Role } = useModels()
const $route = useRoute()
const $modalStore = useModalStore()

// Prepare constants
const TABLE_HEADERS = [
  {
    title: 'Nom',
    property: 'name',
    component: 'data-text'
  },
  {
    title: '',
    component: 'actions'
  }
]

// Prepare reactive data
const limit = ref(25)

// Prepare computed
const records = computed(() => Role.repo.all())
const filters = computed(() => [])
// Rôles figés : aucune action d'édition/suppression proposée.
const abilities = computed(() => [])

// Prepare methods
const _fetchMore = async (skip = 0) => {
  await Role.list(undefined, undefined, { skip, limit: limit.value })
}

// Prepare methods
const _handle = async (action, data = {}) => {
  const { _id } = data
  switch (action) {
    case 'add':
      await Role.create(data)
      break
    case 'update':
      await Role.update(_id, data)
      break
    case 'remove':
      await Role.remove(_id)
      break
    default:
      throw new Error('E_UNHANDLED')
  }
}

const _openModalForm = (action, record) => {
  $modalStore.open({
    onSubmit: async (data) => _handle(action, data),
    details: {
      title: `${action === 'add' ? 'Ajouter' : 'Modifier'} un rôle`,
      subTitle: 'Reinseignez les informations de ce rôle.',
      acceptButton: `${action === 'add' ? 'Ajouter' : 'Modifier'}`,
      closeButton: 'Annuler'
    },
    attributes: [
      {
        property: 'name',
        componentOptions: {
          label: 'Nom du rôle',
          name: 'name'
        },
        component: 'input-text'
      },
      {
        property: 'description',
        componentOptions: {
          label: 'Description rôle',
          name: 'description'
        },
        component: 'input-text'
      },
      {
        property: 'permissions',
        componentOptions: {
          label: 'Permissions du rôle',
          name: 'permissions',
          items: [
            'manage:all',
            'read:deployments',
            'create:deployments',
            'admin:organizations',
            'create:organizations',
            'read:organizations',
            'update:organizations',
            'create:collections',
            'read:collections',
            'update:collections',
            'delete:collections',
            'publish:records',
            'create:records',
            'read:records',
            'update:records',
            'delete:records',
            'create:media',
            'read:media',
            'update:media',
            'delete:media',
            'create:users',
            'read:users',
            'update:users',
            'delete:users',
            'create:roles',
            'read:roles',
            'update:roles',
            'delete:roles',
            'create:tokens',
            'read:tokens',
            'update:tokens',
            'delete:tokens'
          ],
          enableMultiple: true,
          object: false,
          placeHolder: 'Ajouter une ou plusieurs permissions',
        },
        component: 'select-enum'
      },
      {
        property: 'onlyOwn',
        componentOptions: {
          label: 'Restriction créateur',
          description: 'Restreindre le champs d\'action d\'un utilisateur à ses propres ressources uniquement.',
          name: 'onlyOwn',
          property: 'onlyOwn',
          readOnly: true
        },
        component: 'input-toggle'
      },
      {
        property: 'mfa',
        componentOptions: {
          label: 'Authentification multi-facteur',
          description: 'Vérifier l\'authentification d\'un utilisateur via un facteur supplémentaire (authenticator, sms, ...).',
          name: 'mfa',
          property: 'mfa',
          readOnly: true
        },
        component: 'input-toggle'
      }
    ],
    record
  })
}
</script>