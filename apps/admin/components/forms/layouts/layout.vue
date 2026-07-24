<template>
  <div class="lg:grid lg:grid-flow-row lg:auto-rows-max lg:grid-cols-12 lg:gap-x-5">
    <navigation
      v-if="tabs.length"
      :selection="selectedTab"
      :tabs="tabs"
      class="px-2 sm:px-6 lg:py-0 lg:px-0 lg:col-span-2"
      @select="_changeTab"
    />
    <div class="space-y-6 sm:px-6 lg:px-0 lg:col-span-10">
      <forms-section
        v-for="({ componentOptions }, i) in currentSections"
        :key="`form-layout-${i}`"
        v-bind="{ record, ...componentOptions }"
      />
    </div>
  </div>
</template>

<script setup>
import navigation from '~/components/forms/layouts/navigation'
import formsSection from '~/components/forms/layouts/section'

// Prepare props
const $props = defineProps({
  record: {
    type: Object,
    default: () => ({})
  },
  layout: {
    type: Array,
    default: () => []
  }
})

// Prepare reactive data
const selectedTab = ref('')

// Prepare computed
const tabs = computed(() => $props.layout.map(({ title, icon }) => ({ title, icon })))
const currentSections = computed(() => $props.layout.find(({ title }) => title === selectedTab.value)?.sections || [])

// Prepare methods
const _changeTab = (tab) => {
  selectedTab.value = tab
}
</script>
