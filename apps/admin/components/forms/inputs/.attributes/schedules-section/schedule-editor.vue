<template lang="html">
  <div class="group flex items-center">
    <div
      v-if="disabled"
      class="w-full cursor-pointer flex items-center justify-between border border-gray-300 rounded-md p-2 group-hover:border-black"
      @click="toggle"
    >
      <p class="text-sm pl-2">
        {{ periodData }}
      </p>
      <div class="flex items-center">
        <p class="flex flex-col text-sm">
          <span v-for="time in openTimeData" :key="`${periodData || period}-${time}`">
            {{ time }}
          </span>
          <span v-if="!openTimeData.length">
            Fermé
          </span>
        </p>
        <tertiary-icon-button
          :icon="'iconoir:arrow-right-circled'"
          :tooltip="'Modifier les horaires'"
          class="pl-2"
        />
      </div>
    </div>
    <div v-else class="w-full flex flex-col border border-gray-300 rounded-md p-3 group-hover:border-black">
      <text-field
        :name="'period'"
        :place-holder="'Période d\'ouverture'"
        :value="periodData"
        class="w-full mb-2"
        @change="periodData = $event"
      />
      <div
        v-for="(range, i) in openTimeData"
        :key="`${periodData}-${range}`"
        class="flex items-center ml-4"
      >
        <div
          v-for="(time, j) in range.split('-')"
          :key="`${periodData}-${range}-${time}`"
          class="flex items-center my-2 mr-6"
        >
          <p
            class="text-2xs font-light text-gray-500 uppercase h-full"
          >
            {{ j % 2 === 0 ? 'Ouverture' : 'Fermeture' }}
          </p>
          <select-field
            :value="time.split(':')[0]"
            :items="hours"
            :place-holder="'Heures'"
            class="ml-2"
            @change="updateRangeOfTime('hour', i, j, $event)"
          />
          <select-field
            :value="time.split(':')[1]"
            :items="minutes"
            :place-holder="'Minutes'"
            class="ml-2"
            @change="updateRangeOfTime('minute', i, j, $event)"
          />
        </div>
        <tertiary-icon-button
          :icon="'iconoir:remove-empty'"
          :tooltip="'Enlever l\'horaire'"
          @click="removeRangeOfTime(i)"
        />
      </div>
      <tertiary-button
        label="Ajouter un horaire supplémentaire"
        @click="addRangeOfTime"
      />
      <div class="flex mt-2 items-center justify-end">
        <tertiary-button
          label="Annuler"
          @click="cancel"
        />
        <primary-button
          label="Valider"
          @click="updateSchedule"
        />
      </div>
    </div>
    <div class="w-8">
      <tertiary-icon-button
        :icon="'iconoir:remove-empty'"
        :tooltip="'Enlever cette période'"
        class="hidden group-hover:block"
        @click="$emit('remove-schedule')"
      />
    </div>
  </div>
</template>

<script>
import primaryButton from '@/components/template/buttons-section/PrimaryButton'
import tertiaryButton from '@/components/template/buttons-section/TertiaryButton'
import tertiaryIconButton from '@/components/template/buttons-section/TertiaryIconButton'
import textField from '@/components/template/fields-section/TextField'
import selectField from '@/components/template/fields-section/SelectField'

export default {
  name: 'ScheduleEditor',
  components: { primaryButton, tertiaryButton, tertiaryIconButton, textField, selectField },
  props: {
    period: {
      type: String,
      default: ''
    },
    openTime: {
      type: Array,
      default: () => []
    }
  },
  data () {
    return {
      disabled: true,
      periodData: '',
      openTimeData: []
    }
  },
  computed: {
    hours () {
      return [...Array(24).keys()].map(val => val >= 10 ? val.toString() : `0${val}`)
    },
    minutes () {
      return [...Array(60).keys()].map(val => val >= 10 ? val.toString() : `0${val}`)
    }
  },
  mounted () {
    this.initialise()
  },
  methods: {
    initialise () {
      const { $props: { period, openTime } } = this
      Object.assign(this, {
        periodData: period,
        openTimeData: [...openTime]
      })
    },
    toggle () {
      this.disabled = !this.disabled
    },
    cancel () {
      this.toggle()
      this.initialise()
    },
    addRangeOfTime () {
      this.openTimeData.push('09:00-12:00')
    },
    updateRangeOfTime (hhORmm, rangeIndex, timeInRangeIndex, value) {
      console.log(rangeIndex, timeInRangeIndex)
      // Isolate range of time
      const range = this.openTimeData[rangeIndex]
      // Isolate time from range
      // - beginning time (index = 0)
      // - ending time (index = 1)
      const [beginningTime, endingTime] = range.split('-')
      // Build new time value
      const [hours, minutes] = (timeInRangeIndex === 0 ? beginningTime : endingTime).split(':')
      const updatedTime = hhORmm === 'hour' ? `${value}:${minutes}` : `${hours}:${value}`
      // Set new time value in range
      if (timeInRangeIndex === 0) { // beginning time
        this.openTimeData[rangeIndex] = [updatedTime, endingTime].join('-')
      } else { // ending time
        this.openTimeData[rangeIndex] = [beginningTime, updatedTime].join('-')
      }
    },
    removeRangeOfTime (index) {
      this.openTimeData.splice(index, 1)
    },
    updateSchedule () {
      const {
        periodData,
        openTimeData
      } = this
      this.$emit('update-schedule', {
        period: periodData,
        open: !!openTimeData.length,
        openTime: openTimeData
      })
      this.toggle()
    }
  }
}
</script>
