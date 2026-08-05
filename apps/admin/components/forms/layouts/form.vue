<template>
  <div v-show="attributes.length" class="space-y-4">
    <div
      v-for="({ property, component, componentOptions }, i) in attributes"
      :key="i"
      class="w-full"
    >
      <handler-collections v-if="component === 'handler-collections'" v-bind="componentOptions" :read-only="componentOptions.readOnly || loading" />
      <handler-records v-if="component === 'handler-records'" v-bind="componentOptions" :read-only="componentOptions.readOnly || loading" />
      <handler-tokens v-if="component === 'handler-tokens'" v-bind="componentOptions" :read-only="componentOptions.readOnly || loading" />
      <handler-roles
        v-if="component === 'handler-roles'"
        :value="_get(property)"
        v-bind="componentOptions"
        :read-only="componentOptions.readOnly || loading"
        @change="_update(property, $event)"
      />
      <handler-schedules
        v-if="component === 'handler-schedules'"
        :value="_get(property)"
        v-bind="componentOptions"
        :read-only="componentOptions.readOnly || loading"
        @change="_update(property, $event)"
      />
      <handler-steps
        v-if="component === 'handler-steps'"
        :value="_get(property)"
        v-bind="componentOptions"
        :read-only="componentOptions.readOnly || loading"
        @change="_update(property, $event)"
      />
      <input-color-picker
        v-if="component === 'input-color-picker'"
        v-bind="componentOptions"
        :value="_get(property)"
        :read-only="componentOptions.readOnly || loading"
        @change="_update(property, $event)"
      />
      <input-files-media
        v-if="component === 'input-files-media'"
        v-bind="componentOptions"
        :value="_get(property)"
        :read-only="componentOptions.readOnly || loading"
        @change="_update(property, $event)"
      />
      <input-json
        v-if="component === 'input-json'"
        v-bind="componentOptions"
        :value="_get(property)"
        :read-only="componentOptions.readOnly || loading"
        @change="_update(property, $event)"
      />
      <input-text
        v-if="component === 'input-text'"
        v-bind="componentOptions"
        :value="_get(property)"
        :read-only="componentOptions.readOnly || loading"
        @change="_update(property, $event)"
      />
      <input-text-area
        v-if="component === 'input-text-area'"
        v-bind="componentOptions"
        :value="_get(property)"
        :read-only="componentOptions.readOnly || loading"
        @change="_update(property, $event)"
      />
      <input-WYSIWYG
        v-if="component === 'input-wysiwyg'"
        v-bind="componentOptions"
        :value="_get(property)"
        :read-only="componentOptions.readOnly || loading"
        @change="_update(property, $event)"
      />
      <input-toggle
        v-if="component === 'input-toggle'"
        v-bind="componentOptions"
        :value="_get(property)"
        :read-only="componentOptions.readOnly || loading"
        @change="_update(property, $event)"
      />
      <input-location
        v-if="component === 'input-location'"
        v-bind="componentOptions"
        :value="_get(property)"
        :read-only="componentOptions.readOnly || loading"
        @change="_update(property, $event)"
      />
      <select-enum
        v-if="component === 'select-enum'"
        v-bind="componentOptions"
        :value="_get(property)"
        :read-only="componentOptions.readOnly || loading"
        @change="_update(property, $event)"
      />
      <select-collection-enum
        v-if="component === 'select-collection-enum'"
        v-bind="componentOptions"
        :value="_get(property)"
        :read-only="componentOptions.readOnly || loading"
        @change="_update(property, $event)"
      />
      <select-record
        v-if="component === 'select-label' || component === 'select-record'"
        v-bind="componentOptions"
        :value="_get(property)"
        :read-only="componentOptions.readOnly || loading"
        @change="_update(property, $event)"
      />
      <!-- 
      <select-model
        v-if="component === 'select-model'"
        v-bind="componentOptions"
        :value="_get(property)"
        :read-only="componentOptions.readOnly || loading"
        @change="_update(property, $event)"
      /> -->
    </div>
  </div>
</template>

<script setup>
import handlerCollections from '~/components/forms/handlers/handler-collections'
import handlerRecords from '~/components/forms/handlers/handler-records'
import handlerRoles from '~/components/forms/handlers/handler-roles'
import handlerSchedules from '~/components/forms/handlers/handler-schedules'
import handlerTokens from '~/components/forms/handlers/handler-tokens'
import handlerSteps from '~/components/forms/handlers/handler-steps'
import inputColorPicker from '~/components/forms/inputs/input-color-picker'
import inputJson from '~/components/forms/inputs/input-json'
import inputLocation from '~/components/forms/inputs/input-location'
import inputFilesMedia from '~/components/forms/inputs/input-files-media'
import inputText from '~/components/forms/inputs/input-text'
import inputTextArea from '~/components/forms/inputs/input-text-area'
// BASCULE refonte-admin-ui (06/08) : le WYSIWYG est désormais le nouvel
// éditeur (UEditor Nuxt UI + extensions de parité, harnais D9 vert sur les
// 4 bases). REPLI : repointer cet import sur input-wysiwyg (prose) — le
// module prose reste installé jusqu'au groupe 4.
import inputWYSIWYG from '~/components/forms/inputs/input-editor'
// import inputTimeSchedules from '@/components/forms/attributes/input-time-schedules'
import inputToggle from '~/components/forms/inputs/input-toggle'
import selectCollectionEnum from '~/components/forms/selects/select-collection-enum'
import selectEnum from '~/components/forms/selects/select-enum'
import selectRecord from '~/components/forms/selects/select-record'
// import selectModel from '@/components/forms/attributes/select-model'

// Prepare emitters
const $emitters = defineEmits(['change'])

// Prepare props
const $props = defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  attributes: {
    type: Array,
    default: () => []
  },
  record: {
    type: Object,
    default: () => ({})
  }
})

// Prepare reactive data
const updateRecord = ref({})

// Prepare methods
const _get = (key) => {
  const path = key.split('.');
  let value = $props.record;

  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    value = value[key];

    // If the nested property doesn't exist, return undefined
    if (value === undefined) {
      return undefined;
    }
  }

  return value;
}

const _update = (key, value) => {
  const path = key.split('.');
  let targetObject = updateRecord.value;

  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    targetObject = targetObject[key] = targetObject[key] || {};
  }

  const lastKey = path[path.length - 1];
  targetObject[lastKey] = value;

  $emitters('change', updateRecord.value)
}

// Prepare mounted
onMounted(() => {
  if ($props.record?._id) {
    Object.assign(updateRecord.value, { _id: $props.record._id })
  }
})
</script>
