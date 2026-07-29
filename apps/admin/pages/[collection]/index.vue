<template>
  <section class="w-full">
    <default-table
      v-if="!$route.params.event"
      :headers="headers"
      :filters="filters"
      :items="records"
      :actions="abilities"
      :pagination-size="limit"
      display-search-bar
      paginated-content
      @fetch-more="_fetchMoreRecords"
      @update="_updateRecord"
      @remove="_removeRecord"
    />
  </section>
</template>

<script setup>
import defaultTable from '~/components/data/lists/data-lists-table'

// Prepare composable
const { Collection, Record } = useModels()
const $route = useRoute()
const $router = useRouter()

// Prepare page meta
definePageMeta({
  permissions: [`read:records`], // TODO handle collections
  preFetch: ['Record']
})

// Prepare reactive data
const limit = ref(25)

// Prepare computed
const collectionRecord = computed(() => Collection.repo.where('slug', $route.params.collection).first())
const records = computed(() => Record.repo.where('relatedCollection', $route.params.collection).get().map(Record.onRetrieve))
const headers = computed(() => collectionRecord.value.display?.headers || [])
const filters = computed(() => [])
const abilities = computed(() => ['update', 'remove'])

// Prepare methods
const _fetchMoreRecords = async (skip = 0) => {
  await Record.list($route.params.collection, undefined, { skip, limit: limit.value })
}

const _updateRecord = (item) => {
  $router.push(`${$route.path}/${item._id}`)
}

const _removeRecord = async (item) => {
  await Record.remove(item._id, $route.params.collection)
}
</script>
