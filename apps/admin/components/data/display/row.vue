<template>
  <li class="w-full inline-flex items-center justify-start hover:bg-gray-50 cursor-pointer" @click.self="_handleClick">
    <div
      v-for="({ property, component, componentOptions, nestedValue = true, alignRight = false, alignLeft = false, grow = false }) in headers"
      :key="property"
      :class="{
        'flex-grow': grow,
        'text-right': alignRight,
        'text-left': alignLeft
      }"
      class="px-4 py-1"
    >
      <data-avatar
        v-if="component === 'data-avatar'"
        v-bind="componentOptions"
        :value="nestedValue ? item[property] : item"
        @click="_handleClick"
      />
      <data-text
        v-if="component === 'data-text'"
        v-bind="componentOptions"
        :value="nestedValue ? item[property] : item"
        @click="_handleClick"
      />
      <data-badge
        v-if="component === 'data-badge'"
        v-bind="componentOptions"
        :value="nestedValue ? item[property] : item"
        @click="_handleClick"
      />
      <data-label
        v-if="component === 'data-label'"
        v-bind="componentOptions"
        :value="nestedValue ? item[property] : item"
        @click="_handleClick"
      />
      <data-spacer
        v-if="component === 'data-spacer'"
        v-bind="componentOptions"
      />
      <data-last-update
        v-if="component === 'data-last-update'"
        v-bind="componentOptions"
        :value="nestedValue ? item[property] : item"
        @click="_handleClick"
      />
      <!-- <data-color v-if="component === 'data-color'" v-bind="componentOptions" :value="nestedValue ? item[property] : item" class="hidden lg:block" /> -->
      <data-summary
        v-if="component === 'data-summary'"
        v-bind="componentOptions"
        :value="nestedValue ? item[property] : item"
        @click="_handleClick"
      />
      <data-toggle
        v-if="component === 'data-toggle'"
        v-bind="componentOptions"
        :value="nestedValue ? item[property] : item"
        class="item-self-end"
        @change="$emit(property, { ...item, [property]: $event })"
      />
      <dropdown-dots
        v-else-if="component === 'actions'"
        v-bind="componentOptions"
        @action="$emit($event, item)"
      />
    </div>
  </li>
</template>

<script setup>
import dataBadge from '~/components/data/display/row/data-badge'
// import dataColor from '~/components/data/display/row/data-color'
import dropdownDots from '~/components/elements/dropdowns/dots'
import dataLabel from '~/components/data/display/row/data-label'
import dataLastUpdate from '~/components/data/display/row/data-last-update'
import dataSummary from '~/components/data/display/row/data-summary'
import dataSpacer from '~/components/data/display/row/data-spacer'
import dataAvatar from '~/components/data/display/row/data-avatar'
import dataText from '~/components/data/display/row/data-text'
import dataToggle from '~/components/data/display/row/data-toggle'

// Prepare emit
const $router = useRouter()
const $emit = defineEmits(['click', 'update', 'remove', 'fetch-more', 'usage'])

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
  item: {
    type: Object,
    default: () => ({})
  },
  to: {
    type: String,
    default: ''
  }
})

// Prepare methods
const _handleClick = () => {
  console.log('routing to', $props.to)
  $props.to ? $router.replace($props.to) : $emit('click')
}
</script>