<template>
  <div v-if="!isCreating" class="border-b border-gray-200">
    <div class="py-8 max-w-3xl mx-auto px-4 sm:px-6 lg:max-w-7xl lg:px-8 flex items-start justify-between">
      <div class="flex flex-col items-start space-y-1">
        <h3 class="text-3xl leading-10 font-medium text-gray-900">
          {{ recordTitle }}
        </h3>
        <data-last-update v-if="record" :value="record" inline />
        <data-display-badge-publish-status v-if="recordStatus" :status="recordStatus" />
      </div>
      <handler-publication-status :collection="collection" :model="'Record'" :record="record" />
    </div>
  </div>

</template>

<script setup>
import dataLastUpdate from '~/components/data/display/row/data-last-update'
import dataDisplayBadgePublishStatus from '~/components/data/display/row/data-display-badge-publish-status'
import handlerPublicationStatus from '~/components/forms/handlers/handler-publication-status'

const $route = useRoute()
const { Record } = useModels()

// Prepare computed
const isCreating = computed(() => $route.params.record === 'new')
// atm. we use onRetrieve directly in page, it should be better to have this
// handled directly in `pinia-orm` lib
const collection = computed(() => $route.params.collection)
const record = computed(() => Record.onRetrieve(Record.repo.where('_id', $route.params.record).first()))
const recordStatus = computed(() => record.value?.status)
const recordTitle = computed(() => record.value?.title || '')
</script>