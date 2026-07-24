<template>
  <div class="relative block w-full">
    <!-- <div class="bg-gray-200 text-gray-500 text-sm rounded-md w-full p-4">
      /!\ Navigation should be based on organization.collections array only<br>
      Collections that does not belong to organization can't be updated or deleted only enabled / disabled<br>
      Let user duplicate an existing collection for this organization only
    </div> -->
    <button-secondary class="my-1" label="Ajouter une collection" @click="openModalForm('add')" />
    <list-table
      :headers="tableHeaders"
      :items="collections"
      :actions="['update', 'remove']"
      @update="openModalForm('update', $event)"
      @remove="removeCollection($event)"
      @usage="updateCollectionUsage($event)"
    />
  </div>
</template>

<script>
import { mapState } from 'vuex'
import listTable from '@/components/lists/table'
import buttonSecondary from '@/components/elements/buttons/secondary'

export default {
  name: 'HandlerCollections',
  components: { listTable, buttonSecondary },
  data () {
    return {
      availableCollections: [],
      tableHeaders: [
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
    }
  },
  computed: {
    organizationRecord () {
      const { template: { selectedOrganization = {} } } = this
      return selectedOrganization
    },
    organizationCollections () {
      const { $route: { params: { organization } } } = this
      const { collections } = this.$api.Organization.find(organization)
      return collections
    },
    collections () {
      const { organizationCollections } = this
      const collectionRecords = this.$api.Collection.all()
      return collectionRecords.map(({ _id, ...rest }) => ({ _id, usage: organizationCollections.includes(_id), ...rest }))
    },
    ...mapState(['template'])
  },
  beforeDestroy () {
    this.$nuxt.$off('modalCreateCollection')
    this.$nuxt.$off('modalUpdateCollection')
  },
  async mounted () {
    const { collections, availableCollections } = this
    if (!collections.length) {
      await this.$api.Collection.list()
    }
    if (!availableCollections.length) {
      const { organizationRecord: { path = '' } } = this
      const parents = path.split('/')
      if (parents.length) {
        parents.pop()
        const results = await Promise.all(
          parents.map(parent => this.$api.Collection.listFromOrganization(parent))
        )
        this.availableCollections = results.map(({ response }) => response.data.data).flat()
      }
    }
    this.$nuxt.$on('modalCreateCollection', this.createCollection)
    this.$nuxt.$on('modalUpdateCollection', this.updateCollection)
    this.loading = false
  },
  methods: {
    openModalForm (action, record) {
      const creation = action === 'add'
      this.$nuxt.$emit('openModalForm', {
        submitEvent: creation ? 'modalCreateCollection' : 'modalUpdateCollection',
        details: {
          title: `${creation ? 'Créer' : 'Modifier'} une collection`,
          subTitle: 'Entrez un nom pour votre collection afin de l\'identifier facilement.'
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
    },
    async handleCollection (action, data = {}) {
      this.$nuxt.$loading.start()
      try {
        const { _id } = data
        switch (action) {
          case 'add':
            await this.$api.Collection.create(data)
            break
          case 'update':
            await this.$api.Collection.update(_id, data)
            break
          case 'remove':
            await this.$api.Collection.remove(_id)
            break
          default:
            throw new Error('E_UNHANDLED')
        }
      } catch (err) {
        console.log(err)
      } finally {
        this.$nuxt.$loading.finish()
      }
    },
    async createCollection (data) {
      await this.handleCollection('add', data)
    },
    async updateCollection (data) {
      await this.handleCollection('update', data)
    },
    async removeCollection (data) {
      await this.handleCollection('remove', data)
    },
    async updateCollectionUsage ({ _id: collectionId, usage }) {
      this.$nuxt.$loading.start()
      try {
        const { organizationCollections, organizationRecord: { _id } } = this
        if (usage && !organizationCollections.includes(collectionId)) {
          await this.$api.Organization.update(_id, { collections: [...organizationCollections, collectionId] })
        }
        if (!usage && organizationCollections.includes(collectionId)) {
          await this.$api.Organization.update(_id, { collections: [...organizationCollections.filter(check => check !== collectionId)] })
        }
      } catch (err) {
        console.log(err)
      } finally {
        this.$nuxt.$loading.finish()
      }
    }
  }
}
</script>
