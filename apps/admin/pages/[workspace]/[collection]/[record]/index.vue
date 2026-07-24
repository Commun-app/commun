<template>
  <div>
    <!-- <alert
      v-if="alertSort"
      :sort="alertSort"
      :title="ALERTS_MESSAGES[alertSort].title"
      :description="ALERTS_MESSAGES[alertSort].description"
    /> -->
    <forms-layout
      v-if="componentOptions"
      v-bind="{ record, ...componentOptions }"
      class="mt-4"
    />
  </div>
</template>

<script setup>
// import alert from '@/components/template/content-section/Alert'
import formsLayout from '~/components/forms/layouts/layout'

definePageMeta({
  permissions: ['read:records'],
  preFetch: ['Record'],
  layout: 'record'
})

// Prepare constants
// const ALERTS_MESSAGES = {
//   info: {
//     title: 'Cet évènement est validé',
//     description: 'Nos équipes ont validé cet évènemnt, il sera prochainement publié en ligne.'
//   },
//   warn: {
//     title: 'Cet évènement est en attente de validation',
//     description: 'Avant d\'être publié, cet évènement doit être validé par nos équipes.'
//   },
//   success: {
//     title: 'Cet évènement est publié',
//     description: 'Vous n\'avez plus rien à faire, vous pouvez consulter cet évènement en ligne.'
//   }
// }

const { Collection, Record } = useModels()
const $route = useRoute()

// Prepare computed
const isCreating = computed(() => $route.params.record === 'new')
const collectionRecord = computed(() => Collection.repo.where('slug', $route.params.collection).first())
const componentOptions = computed(() => {
  const options = JSON.parse(JSON.stringify(collectionRecord.value?.editor || {}))
  if (isCreating.value) {
    options.componentOptions.layout.length = 1
    options.componentOptions.layout[0].sections.length = 1
  }
  return options.componentOptions
})
const record = computed(() => {
  // atm. we use onRetrieve directly in page, it should be better to have this
  // handled directly in `pinia-orm` lib
  if (!isCreating.value) {
    return Record.onRetrieve(
      Record.repo.where('_id', $route.params.record).first()
    )
  }
  return {}
})

// const status = computed(() => {
//   const { record: { status } } = this
//   return status
// }

// const alertSort = computed(() => {
//   const { status, $auth } = this
//   switch (status) {
//     case 'waiting':
//       return $auth.hasScope('validate:events') || $auth.hasScope('manage:all') ? '' : 'warn'
//     case 'ready':
//       return $auth.hasScope('publish:events') || $auth.hasScope('manage:all') ? '' : 'info'
//     case 'published':
//     case 'scheduled':
//       return 'success'
//     case 'draft':
//     default:
//       return ''
//   }
// }
</script>
