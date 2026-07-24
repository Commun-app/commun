<template>
  <div class="w-full">
    <table class="table-auto w-full h-12">
      <thead
        v-if="displayHeader"
        class="bg-gray-50 border border-gray-200 rounded-md"
      >
        <tr>
          <th
            v-for="({ title, property, alignRight = false }) in headers"
            :key="property"
            scope="col"
            class="px-4 py-4 text-left text-xs font-light text-gray-500 uppercase tracking-wider"
            :class="alignRight ? 'text-right' : 'text-left'"
          >
            {{ title }}
          </th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        <tr
          v-for="(item, i) in items"
          :key="i"
          class="hover:bg-gray-50"
        >
          <td
            v-for="({ property, component, componentOptions, nestedValue = true, alignRight = false }) in headers"
            :key="property"
            :class="alignRight ? 'text-right' : 'text-left'"
            class="flex-row items-center px-4 py-3"
          >
            <data-badge
              v-if="component === 'data-badge'"
              v-bind="componentOptions"
              :value="nestedValue ? item[property] : item"
              @click="$emitters('update', item)"
            />
            <data-label
              v-if="component === 'data-label'"
              v-bind="componentOptions"
              :value="nestedValue ? item[property] : item"
              @click="$emitters('update', item)"
            />
            <data-last-update
              v-if="component === 'data-last-update'"
              v-bind="componentOptions"
              :value="nestedValue ? item[property] : item"
              @click="$emitters('update', item)"
            />
            <data-text
              v-if="component === 'data-text'"
              v-bind="componentOptions"
              :value="nestedValue ? item[property] : item"
              @click="$emitters('update', item)"
            />
            <!-- <data-color
              v-if="component === 'data-color'"
              v-bind="componentOptions"
              :value="nestedValue ? item[property] : item"
              class="hidden lg:block"
              @click="$emitters('update', item)"
            />
            -->
            <data-summary
              v-if="component === 'data-summary'"
              v-bind="componentOptions"
              :value="nestedValue ? item[property] : item"
              @click="$emitters('update', item)"
            />
            <data-toggle
              v-if="component === 'data-toggle'"
              v-bind="componentOptions"
              :value="nestedValue ? item[property] : item"
              @change="$emit(property, { ...item, [property]: $event })"
            />
            <dropdown-dots
              v-else-if="component === 'actions' && enabledActions.length"
              :options="enabledActions"
              @action="$emitters($event, item)"
            />
          </td>
        </tr>
      </tbody>
    </table>
    <button-secondary
      v-if="displayPaginationButton"
      class="w-full mt-2"
      label="Plus de résultats"
      @click="_displayMoreItem"
    />
  </div>
</template>

<script setup>
import dataBadge from '~/components/data/display/row/data-badge'
// import dataColor from '~/components/data/display/row/data-color'
import dropdownDots from '~/components/elements/dropdowns/dots'
import dataLabel from '~/components/data/display/row/data-label'
import dataLastUpdate from '~/components/data/display/row/data-last-update'
import dataSummary from '~/components/data/display/row/data-summary'
import dataText from '~/components/data/display/row/data-text'
import dataToggle from '~/components/data/display/row/data-toggle'
import buttonSecondary from '~/components/elements/buttons/secondary'

// Prepare constants
const DOTS_OPTIONS = [
  { label: 'Modifer', action: 'update' },
  { label: 'Supprimer', action: 'remove' }
]

// Prepare emitters
const $emitters = defineEmits(['update', 'remove', 'fetch-more', 'usage'])

// Prepare props
const $props = defineProps({
  displayHeader: {
    type: Boolean,
    default: false
  },
  headers: {
    type: Array,
    default: () => []
  },
  items: {
    type: Array,
    default: () => []
  },
  actions: {
    type: Array,
    default: () => []
  },
  paginationSize: {
    type: Number,
    default: 10
  },
  paginatedContent: {
    type: Boolean,
    default: false
  }
})

// Prepare reactive data
const pagination = ref(1)

// Prepare computed
const enabledActions = computed(() => $props.actions.map(name => DOTS_OPTIONS.find(({ action }) => action === name)))
const paginatedItems = computed(() =>  $props.paginatedContent ? $props.items.slice(0, $props.paginationSize * pagination.value) : $props.items)
const displayPaginationButton = computed(() => $props.paginatedContent && pagination.value * $props.paginationSize <= paginatedItems.value.length)

// Prepare methods
const _displayMoreItem = async () => {
  $emitters('fetch-more', pagination.value * $props.paginationSize)
  pagination.value++
}
</script>
