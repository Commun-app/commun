<template>
  <div>
    <label
      v-if="label"
      class="block text-2xs font-light tracking-wider text-gray-500 uppercase"
    >
      {{ label }}
    </label>
    <schedule-editor
      v-for="({ period, openTime }, i) in schedules"
      :key="period"
      :period="period"
      :open-time="openTime"
      :class="{ 'mt-1':label }"
      class="w-full"
      @update-schedule="updateSchedule(i, $event)"
      @remove-schedule="removeSchedule(i)"
    />
    <tertiary-button
      label="Ajouter une période"
      @click="addSchedule"
    />
  </div>
</template>

<script>
import scheduleEditor from '@/components/forms/attributes/schedules-section/schedule-editor'
import tertiaryButton from '@/components/template/buttons-section/TertiaryButton'

export default {
  name: 'SchedulesHandler',
  components: { scheduleEditor, tertiaryButton },
  props: {
    label: {
      type: String,
      default: ''
    },
    value: {
      type: Array,
      default: () => []
    }
  },
  data () {
    return {
      defaultPeriods: [
        'Lundi',
        'Mardi',
        'Mercredi',
        'Jeudi',
        'Vendredi',
        'Samedi',
        'Dimanche'
      ],
      defaultOpeningTime: ['09:00-19:00'],
      schedules: []
    }
  },
  watch: {
    value: {
      immediate: true,
      handler (val) {
        if (val && val.length) {
          this.schedules = [...val]
        }
      }
    }
  },
  mounted () {
    const { $props: { value } } = this
    if (!value.length) {
      this.schedules = this.defaultPeriods.map(period => ({
        period,
        open: true,
        openTime: this.defaultOpeningTime
      }))
    }
  },
  methods: {
    addSchedule () {
      const { defaultOpeningTime } = this
      this.schedules.push({
        period: 'Nouvelle période',
        open: true,
        openTime: defaultOpeningTime
      })
    },
    updateSchedule (index, value) {
      this.schedules[index] = value
      this.$emit('change', [...this.schedules])
    },
    removeSchedule (index) {
      this.schedules.splice(index, 1)
      this.$emit('change', [...this.schedules])
    }
  }
}
</script>
