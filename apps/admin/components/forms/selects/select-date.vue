<template>
  <div>
    <label
      v-if="label"
      id="listbox-label"
      class="block text-2xs font-light tracking-wider text-gray-500 uppercase"
    >
      {{ label }}
    </label>
    <div
      :class="{ 'mt-1':label }"
      class="relative"
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded="true"
        aria-labelledby="listbox-label"
        :class="{ 'ring-gray-50 border-gray-900':display, '!bg-gray-100 !text-gray-200': readOnly }"
        :disabled="readOnly"
        class="relative w-full bg-white rounded-md pl-3 pr-10 py-2 text-left cursor-pointer shadow-xs border border-gray-200 focus:outline-none focus:ring-gray-50 focus:border-black hover:border-black text-sm"
        @click="_toggle"
      >
        <div class="flex justify-between items-center">
          <span :class="{ '!text-gray-400': readOnly }" class="truncate">
            {{ selectionDate }}
          </span>
          <span v-if="timePicker">
            {{ selectionTimeBegin }} <span v-if="timeEnd">→ {{ selectionTimeEnd }}</span>
          </span>
        </div>
        <span class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <icon
          class="text-gray-400 h-5 w-5"
          :icon="timePicker ? 'carbon:event-schedule' : 'carbon:calendar'"
        />
        </span>
      </button>
      <transition
        leave-active-class="transition ease-in duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="display" ref="calendar" class="absolute flex flex-col mt-1 p-4 w-full min-w-[20rem] bg-white shadow-lg z-50 rounded-md">
          <!-- time picker -->
          <div v-if="timePicker" class="inline-flex space-x-1 pb-2 border-b border-gray-100">
            <select-enum
              :items="hoursBegin"
              :value="selectionTimeBegin"
              :object="false"
              class="w-full"
              @change="_updateHour('begin', $event)"
            />
            <select-enum
              v-if="timeEnd"
              :items="hoursEnd"
              :value="selectionTimeEnd"
              :object="false"
              class="w-full"
              @change="_updateHour('end', $event)"
            />
          </div>
          <!-- Header -->
          <div class="flex flex-col items-start md:items-center md:flex-row justify-between w-full pt-2 mb-1">
            <span class="text-sm font-bold mb-2 md:mb-0">
              {{ calendarMonth }}
            </span>
            <div class="inline-flex">
              <icon
                class="text-gray-400 hover:text-white hover:bg-primary p-1 cursor-pointer rounded-md h-6 w-6"
                icon="material-symbols:chevron-left"
                @click="_previousMonth"
              />
              <icon
                class="text-gray-400 hover:text-white hover:bg-primary p-1 cursor-pointer rounded-md h-6 w-6"
                icon="material-symbols:chevron-right-rounded"
                @click="_nextMonth"
              />
            </div>
          </div>

          <!-- Calendar Body -->
          <div class="flex-grow grid grid-cols-7 gap-0.5 rounded-md">
            <div v-for="day in WEEK_DAYS" :key="day" class="h-min text-center text-gray-500 font-semibold mt-3 text-xs self-end">
              {{ day }}
            </div>
            <button
              v-for="({ dt, selected, current }) in calendarDays"
              :key="dt.ordinal"
              :class="{
                'bg-white hover:bg-primary text-black hover:text-white': current && !selected,
                'bg-primary text-white': current && selected,
                'text-gray-400': !current && !selected
              }"
              class="relative w-full rounded-md px-2 py-1.5"
              @click="_select(dt)"
            >
              <span class="text-xs self-end">
                {{ dt.day }}
              </span>
            </button>
          </div>
        </div>
      </transition>
    </div>
  </div>

</template>

<script setup>
import { Icon } from '@iconify/vue'
import { DateTime, Info } from 'luxon'
import selectEnum from '~/components/forms/selects/select-enum'

// Prepare constant
const TODAY = DateTime.now({ zone: 'Europe/Paris' })
const WEEK_DAYS = Info.weekdays('narrow', { locale: 'fr' })
const HOURS = ['00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30', '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30']

// Prepare props
const $props = defineProps({
  label: {
    type: String,
    default: ''
  },
  timePicker: {
    type: Boolean,
    default: false
  },
  timeEnd: {
    type: Boolean,
    default: false
  },
  readOnly: {
    type: Boolean,
    default: false
  },
  value: {
    type: String,
    default: ''
  }
})

// Prepare emitters
const $emitters = defineEmits(['select'])

// Prepare dynamic data
const display = ref(false)
const selectionBegin = ref(TODAY.set({ hour: 0, minute: 0, second: 0 }))
const selectionEnd = ref(TODAY.set({ hour: 23, minute: 59, second: 0 }))
const calendar = ref(null)

// Prepare computed
const hoursBegin = computed(() => HOURS)
const hoursEnd = computed(() => HOURS)
const selectionDate = computed(() => selectionBegin.value.toFormat('ccc d LLL', { locale: 'fr' }))
const selectionTimeBegin = computed(() => selectionBegin.value.toFormat('HH:mm', { locale: 'fr' }))
const selectionTimeEnd = computed(() => selectionEnd.value.toFormat('HH:mm', { locale: 'fr' }))
const calendarMonth = computed(() => selectionBegin.value.toFormat('LLLL yyyy', { locale: 'fr' }))
const calendarDays = computed(() => {
  // Prepare array of days
  const selectedDT = selectionBegin.value
  const days = []

  // Determine the final days of the previous month until the last monday
  let previousMonthDT = selectedDT.minus({ months: 1 }).endOf('month')
  while (previousMonthDT.weekday !== 1) {
    days.push({ dt: previousMonthDT })
    previousMonthDT = previousMonthDT.minus({ days: 1 })
  }
  days.push({ dt: previousMonthDT })

  // Complete array with seleted month days
  days.reverse().push(
    ...Array.from(
      { length: selectedDT.endOf('month').day },
      (_, day) => ({
        dt: selectedDT.set({ day: day + 1 }),
        selected: selectedDT.day.toString() === (day + 1).toString(),
        current: true
      })
    )
  )

  // Complete array to with the next month beginning day
  let nextMonthDT = selectedDT.plus({ months: 1 }).startOf('month')
  while (nextMonthDT.weekday !== 1) {
    days.push({ dt: nextMonthDT })
    nextMonthDT = nextMonthDT.plus({ days: 1 })
  }
  return days
})

// Prepare watchers
watch(
  () => $props.value,
  (newValue) => {
    if (newValue) {
      console.log(newValue)
      selectionBegin.value = DateTime.fromISO(newValue)
    }
  },
  { immediate: true }
)

// Prepare methods
const _emitChange = () => {
  $emitters('change', {
    date: selectionBegin.value.toISO(),
    beginTime: selectionBegin.value.toISO(),
    endTime: selectionEnd.value.toISO()
  })
}
const _updateHour = (beginOrEnd, time) => {
  const [hour, minute] = time.split(':')
  if (beginOrEnd === 'begin') {
    selectionBegin.value = selectionBegin.value.set({ hour, minute })
  } else {
    selectionEnd.value = selectionEnd.value.set({ hour, minute })
  }
  _emitChange()
}
const _select = (dt) => {
  selectionBegin.value = dt.set({ hour: selectionBegin.value.hour, minute: selectionBegin.value.minute })
  selectionEnd.value = dt.set({ hour: selectionEnd.value.hour, minute: selectionEnd.value.minute })
  _emitChange()
}
const _nextMonth = () => {
  selectionBegin.value = selectionBegin.value.plus({ month: 1 })
  selectionEnd.value = selectionEnd.value.plus({ month: 1 })
}
const _previousMonth = () => {
  selectionBegin.value = selectionBegin.value.minus({ months: 1 })
  selectionEnd.value = selectionEnd.value.minus({ months: 1 })
}
const _toggle = () => {
  display.value = !display.value
}
const _close = () => {
  display.value = false
}

// Prepare directives
onClickOutside(calendar, _close)
</script>
