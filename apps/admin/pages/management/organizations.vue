<template>
  <div class="relative block w-full">
    <!-- Instance single-tenant : une seule collectivité par déploiement. -->
    <p class="mb-6 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
      Cette instance héberge une seule collectivité — la création d'organisations n'est plus disponible.
    </p>

    <data-list :items="sortedOrganizations" :density="1" :density-children="2" :group-by="'type'" :item-value="'type'" class="space-y-4 bg-gray-50 p-2 rounded-md">
      <template #item="{ item }">
        <h3 class="text-gray-400 text-sm font-medium mb-2 pl-2">
          @ {{ item.type }}
        </h3>
      </template>
      <template #item-child="{ item: itemChild }">
        <data-list-row
          :item="itemChild"
          :to="`/${itemChild._id}`"
          :headers="ROW_DEFINITION"
          class="border border-gray-100 bg-white shadow-sm rounded-lg"
          @click="_handleRowEvent"
        />
      </template>
    </data-list>
  </div>
</template>

<script setup>
import ButtonSecondary from '~/components/elements/buttons/secondary'
import dataList from '~/components/data/lists/data-list'
import dataListRow from '~/components/data/display/row'
import { useWorkspaceStore } from '~/store/layout/workspace'
import { useModalStore } from '~/store/layout/modal'

definePageMeta({
  permissions: ['manage:all'],
  preFetch: ['Organization'],
  headings: {
    title: 'Organisations',
    description: 'Retrouvez & managez ici toutes les organisations.'
  }
})

const { Organization } = useModels()
const modalStore = useModalStore()

// Prepare constants
const ORGANIZATIONS_ORDER = ['customer', 'network', 'country', 'bu', 'root'];
const ROW_DEFINITION = [
  {
    component: 'data-avatar',
    nestedValue: false
  },
  {
    nestedValue: false,
    componentOptions: {
      titleKey: 'name',
      descriptionKey: 'path',
    },
    component: 'data-summary'
  },
  {
    component: "data-spacer",
    grow: true
  },
  {
    component: 'actions',
    componentOptions: {
      options: [{ label: 'Voir', action: 'read' }]
    }
  }
]

// Prepare data
const { data: organizations } = await useAsyncData('overview', () => Organization.list())

// Prepare computed
const sortedOrganizations = computed(() => organizations.value.sort((a, b) => ORGANIZATIONS_ORDER.indexOf(a.type) - ORGANIZATIONS_ORDER.indexOf(b.type)))

// Prepare methods
const _handleRowEvent = async (eventName, value) => {
  console.log(eventName, value)
}
// import { UPDATE_ORGANIZATION } from '~/store/actions'
// import buttonSecondary from '~/components/elements/buttons/secondary'

// export default {
//   name: 'Organizations',
//   meta: {
//     permissions: ['entrance:self'],
//     preFetch: ['Organization'],
//     headings: {
//       title: 'Organisations',
//       description: 'Retrouvez & managez ici toutes les organisations.'
//     }
//   },
//   components: { buttonSecondary },
//   computed: {
//     organizations () {
//       return this.$api.Organization.all()
//     }
//   },
//   beforeDestroy () {
//     this.$nuxt.$off('modalCreateOrganization')
//   },
//   mounted () {
//     this.$nuxt.$on('modalCreateOrganization', this.createOrganization)
//   },
//   methods: {
//     async updateSelectedOrganization (organizationRecord) {
//       try {
//         await this.$store.dispatch(UPDATE_ORGANIZATION, organizationRecord)
//         this.$router.replace(`${organizationRecord.slug}/`)
//       } catch (err) {
//         console.log(err) // eslint-disable-line
//       }
//     },
//     openModalForm (record) {
//       this.$nuxt.$emit('openModalForm', {
//         submitEvent: 'modalCreateOrganization',
//         details: {
//           title: 'Créer une nouvelle organisation',
//           subTitle: 'Renseignez cette nouvelle entité.'
//         },
//         attributes: [
//           // directParent
//           {
//             property: 'directParent',
//             componentOptions: {
//               placeHolder: 'Parent de l\'organisation',
//               name: 'directParent',
//               model: 'Organization',
//               object: true,
//               itemKey: 'name',
//               itemValue: 'slug'
//             },
//             component: 'select-model'
//           },
//           {
//             property: 'type',
//             componentOptions: {
//               placeHolder: 'Type d\'organisation',
//               name: 'type',
//               items: [
//                 'bu',
//                 'country',
//                 'network',
//                 'customer'
//               ]
//             },
//             component: 'select-enum'
//           },
//           {
//             property: 'slug',
//             componentOptions: {
//               placeHolder: 'Identifiant de l\'organisation (slug)',
//               name: 'slug'
//             },
//             component: 'input-text'
//           },
//           {
//             property: 'name',
//             componentOptions: {
//               placeHolder: 'Nom de l\'organisation',
//               name: 'name'
//             },
//             component: 'input-text'
//           },
//           {
//             property: 'type',
//             componentOptions: {
//               placeHolder: 'Localisation',
//               name: 'organization'
//             },
//             component: 'input-location'
//           }
//         ],
//         record
//       })
//     },
//     async createOrganization (data = {}) {
//       this.$nuxt.$loading.start()
//       try {
//         await this.$api.Organization.create(data)
//       } catch (err) {
//         console.log(err)
//       } finally {
//         this.$nuxt.$loading.finish()
//       }
//     }
//   }
// }
</script>