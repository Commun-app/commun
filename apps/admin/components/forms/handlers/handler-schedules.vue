<template>
  <div class="relative block w-full">
    <label
      v-if="label"
      id="listbox-label"
      class="block text-2xs font-light tracking-wider text-gray-500 uppercase"
    >
      {{ label }}
    </label>
    <list-table
      v-if="periodsDataList.length"
      :headers="TABLE_HEADERS"
      :items="periodsDataList"
      :actions="['remove']"
      :class="{ 'mt-1': label }"
      class="col-span-4 bg-gray-100 p-2"
      @remove="_removePeriod"
    />
    <div v-if="displayPeriodHandler" class="flex flex-col space-y-1 my-4">
      <div class="inline-flex w-full items-center space-x-2">
        <select-date
          :time-picker="enableTime"
          :time-end="!enableToDate"
          :value="periodFromDate"
          class="w-1/4"
          @change="_updateCurrentPeriod('begin', $event)"
        />
        <select-date
          v-if="enableToDate"
          :time-picker="enableTime"
          :value="periodToDate"
          class="w-1/4"
          @change="_updateCurrentPeriod('end', $event)"
        />
        <select-enum
          v-if="enablePeriodicity"
          :items="PERIODICITY"
          :item-key="'label'"
          :item-value="'value'"
          :value="periodPeriodicity"
          place-holder="Récurrence"
          class="w-1/4"
          @change="periodPeriodicity = $event"
        />
        <button-secondary label="Ajouter date(s)" class="whitespace-nowrap" @click="_addPeriod" />
        <button-tertiary v-if="selection.periods?.length" label="Annuler" class="!px-0" @click="displayPeriodHandler = false" />
      </div>
      <div class="flex flex-col justify-start">
        <input-toggle
          :value="enableToDate || enablePeriodicity"
          :default-value="false"
          :description="'Date de fin différente'"
          :icon="false"
          small
          @change="_toggleToDate"
        />
        <input-toggle
          :value="enableTime"
          :default-value="false"
          :description="'Inclure des horaires'"
          :icon="false"
          small
          @change="_toggleTime"
        />
        <input-toggle
          :value="enablePeriodicity"
          :default-value="false"
          :description="'Récurrent'"
          :icon="false"
          small
          @change="_togglePeriodicity"
        />
      </div>   
    </div>
    <div v-else class="inline-flex w-full justify-end">
      <button-tertiary label="Ajouter une autre date" class="!px-0" @click="displayPeriodHandler = true" />
    </div>
  </div>
</template>

<script setup>
import { Interval } from 'luxon'
import listTable from '~/components/data/lists/data-lists-table'
import selectDate from '~/components/forms/selects/select-date'
import selectEnum from '~/components/forms/selects/select-enum'
import inputToggle from '~/components/forms/inputs/input-toggle'
import buttonSecondary from '~/components/elements/buttons/secondary'
import buttonTertiary from '~/components/elements/buttons/tertiary'

// Prepare constants
const PERIODICITY = [
  { label: 'Tous les jours', value: 'DAILY' },
  { label: 'Tous les semaines', value: 'WEEKLY' },
  { label: 'Tous les mois', value: 'MONTHLY' },
  { label: 'Chaque année', value: 'YEARLY' },
]
const TABLE_HEADERS = [
  {
    property: 'Période',
    component: 'data-summary',
    nestedValue: false  
  },
  {
    title: '',
    component: 'actions',
    componentOptions: {
      options: [
        { label: 'Supprimer', action: 'remove' }
      ]
    }
  }
]

// Prepare props
const $props = defineProps({
  label: {
    type: String,
    default: ''
  },
  value: {
    type: Array,
    default: () => []
  }
})

// Prepare $emitters
const $emitters = defineEmits(['keyup.enter', 'change'])

// Prepare data
const selection = ref({})
const displayPeriodHandler = ref(true)
const periodFromDate = ref('')
const periodToDate = ref('')
const periodPeriodicity = ref('UNIQUE')
const enableToDate = ref(false)
const enableTime = ref(false)
const enablePeriodicity = ref(false)

// Prepare computed
const periodsDataList = computed(
  () => selection.value?.periods?.map(
    ({ fromDate, toDate, periodicity }) => ({
      title: Interval.fromISO(`${fromDate}/${toDate}`, { locale: 'fr' }).toFormat('ccc d LLL à H:mm', { locale: 'fr' }),
      description: PERIODICITY.find(({ value }) => value === periodicity)?.label || 'Une seule fois',
      fromDate,
      toDate
    })
  ) || []
)
// Prepare methods
const _resetDisplay = () => {
  periodFromDate.value = ''
  periodToDate.value = ''
  periodPeriodicity.value = 'UNIQUE'
  enableToDate.value = false
  enableTime.value = false
  enablePeriodicity.value = false
  displayPeriodHandler.value = false
}
const _togglePeriodicity = (value) => {
  enablePeriodicity.value = value
  enableToDate.value = value
}
const _toggleToDate = (value) => {
  enableToDate.value = value
}
const _toggleTime = (value) => {
  enableTime.value = value
}
const _updateCurrentPeriod = (beginOrEnd, data) => {
  if (beginOrEnd === 'begin') {
    periodFromDate.value = data.beginTime
    if (!enableToDate.value) {
      periodToDate.value = data.endTime
    }
  } else {
    periodToDate.value = data.date
  }
}
const _addPeriod = () => {
  if (!selection.value?.periods) {
    selection.value = { periods: [] }
  }
  selection.value.periods.push({
    fromDate: periodFromDate.value,
    toDate: periodToDate.value,
    periodicity: periodPeriodicity.value
  })
  $emitters('change', selection.value)
  _resetDisplay()
}
const _removePeriod = (val) => {
  const indexToRemove = selection.value.periods?.findIndex(
    ({ fromDate, toDate }) => fromDate === val.fromDate && toDate === val.toDate
  )
  if (indexToRemove >= 0) {
    selection.value.periods?.splice(indexToRemove, 1)
  }
  $emitters('change', selection.value)
}

// prepare watchers
watch(
  () => $props.value,
  (newValue) => {
    if (newValue?.periods?.length) {
      selection.value = newValue
      displayPeriodHandler.value = !selection.value?.periods?.length
    }
  },
  { immediate: true }
)
</script>
