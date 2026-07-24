<template>
  <ul :class="gridDensity" class="grid gap-2 w-full">
    <li
      v-for="({ children, ...item }, i) in groupedItems"
      :key="`group-item-${item[itemValue]}`"
      :class="{ 'col-span-full': children?.length }"
    >
      <!-- [list]item-by slot -->
      <slot name="item" v-bind="{ item, isFirst: i === 0, isLast: i === groupedItems.length - 1 }">
        {{ item }}
      </slot>

      <!-- [list]item-child slot -->
      <ul v-if="children?.length" :class="gridDensityChidren" class="grid w-full">
        <li v-for="(itemChild, j) in children" :key="`item-${itemChild[itemValue]}`">
          <slot name="item-child" v-bind="{ item: itemChild, isFirst: j === 0, isLast: j === children.length - 1 }">
            {{ itemChild }}
          </slot>
        </li>
      </ul>
    </li>
  </ul>
</template>

<script setup>
// Prepare constants
const GRID_PRESETS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
}

// Prepare props
const $props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  itemKey: {
    type: String,
    default: ''
  },
  itemValue: {
    type: String,
    default: 'value'
  },
  groupBy: {
    type: String,
    default: ''
  },
  density: {
    type: Number,
    default: 5,
    enums: [1, 2, 3, 4, 5]
  },
  densityChildren: {
    type: Number,
    default: 5,
    enums: [1, 2, 3, 4, 5]
  }
})

// Prepare computed
const gridDensity = computed(() => GRID_PRESETS[$props.density])
const gridDensityChidren = computed(() => GRID_PRESETS[$props.densityChildren])
const groupedItems = computed(() => {
  if ($props.groupBy) {
    const _items = new Map()
    for (const item of $props.items) {
      const group = item[$props.groupBy]
      if (group) {
        const parent = $props.items.find(({ [$props.itemValue]: check }) => check === group)
        if (!_items.has(parent)) {
          _items.set(parent, [])
        }
        _items.get(parent).push(item)
      }
    }
    return Array.from(_items, ([parent, children]) => ({ ...parent, children }))
  }
  return $props.items
})
</script>
