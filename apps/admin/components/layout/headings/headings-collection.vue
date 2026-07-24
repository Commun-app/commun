<template>
  <div v-show="headingsStore.hasHeadings" class="border-b border-gray-200">
    <div class="py-8 max-w-3xl mx-auto px-4 sm:px-6 lg:max-w-7xl lg:px-8 flex items-start justify-between">
      <div>
        <h3 class="text-3xl leading-10 font-medium text-gray-900">
          {{ headingsStore.headings.title }}
        </h3>
        <p class="mt-2 pb-4 text-sm text-gray-500">
          {{ headingsStore.headings.description }}
        </p>
      </div>
      <button-primary
        v-if="headingsStore.headings.mainAction"
        :label="headingsStore.headings.mainAction"
        @click="$router.replace(`${$route.fullPath}/new`)"
      />
    </div>
  </div>

</template>

<script setup>
import { useHeadingsStore } from '~/store/layout/headings'
import ButtonPrimary from '~/components/elements/buttons/primary'

const $route = useRoute()
const $router = useRouter()
const headingsStore = useHeadingsStore()
</script>
