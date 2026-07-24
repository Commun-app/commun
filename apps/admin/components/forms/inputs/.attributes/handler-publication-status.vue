<template>
  <div class="relative">
    <div class="flex items-center w-36 text-left shadow-xs text-sm" @click="toggle">
      <button
        class="focus:outline-none border border-black text-black block truncate cursor-default px-4 py-2 w-full rounded-l-md"
      >
        {{ actionLabel }}
      </button>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded="true"
        aria-labelledby="listbox-label"
        class="flex items-center p-2 rounded-r-md cursor-pointer bg-black focus:outline-none border border-black"
      >
        <svg class="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
    <transition
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="display"
        v-click-outside="close"
        class="absolute flex flex-col justify-center right-0 mt-1 p-4 space-y-2 w-64 rounded-md bg-white shadow-lg z-50"
      >
        <alert sort="info" :description="actionAlert" />
        <!-- <ul tabindex="-1" role="listbox" aria-labelledby="listbox-label" aria-activedescendant="listbox-item-3" class="text-base overflow-auto focus:outline-none sm:text-sm">
          <li
            v-for="({ label, option }, i) in list"
            :id="`listbox-item-${i}`"
            :key="option"
            class="cursor-pointer select-none relative py-2 pl-4 pr-4 text-gray-900 hover:bg-gray-100"
            role="option"
            @click="updateStatus(option)"
          >
            <span class="font-normal block truncate">
              {{ label }}
            </span>
          </li>
        </ul> -->
        <!-- si publish dans les permissions -->
        <tertiary-button
          v-if="canValidate && status === 'draft'"
          :label="'Valider la ressource'"
          @click="updateStatus('ready')"
        />
        <tertiary-button
          v-if="canPublish && ['draft', 'waiting'].includes(status)"
          :label="'Publier la ressource'"
          @click="updateStatus('published')"
        />
        <primary-button
          :label="`${actionLabel} la ressource`"
          class="mt-1"
          @click="updateStatus(actionTo)"
        />
      </div>
    </transition>
  </div>
</template>

<script>
import { directive } from 'v-click-outside'
import alert from '@/components/template/content-section/Alert'
import primaryButton from '@/components/elements/buttons/primary'
import tertiaryButton from '@/components/elements/buttons/tertiary'

export default {
  name: 'HandlerPublicationStatus',
  directives: {
    clickOutside: directive
  },
  components: {
    alert,
    primaryButton,
    tertiaryButton
  },
  props: {
    collection: {
      type: String,
      default: ''
    },
    model: {
      type: String,
      default: ''
    },
    record: {
      type: Object,
      default: () => ({})
    }
  },
  data () {
    return {
      display: false,
      list: [
        { label: 'Brouillon', option: 'draft' },
        { label: 'En cours de valiation', option: 'waiting' },
        { label: 'Prêt', option: 'ready' },
        // { label: '', option: 'scheduled' },
        { label: 'Publié', option: 'published' }
      ],
      action: [
        {
          label: 'Soumettre',
          alert: 'Une fois soumise, cette ressource devra être validée avant publication.',
          from: 'draft',
          to: 'waiting'
        },
        {
          label: 'Valider',
          ability: this.canValidate,
          alert: 'Une fois validée, cette ressource devra être publiée afin de la rendre disponible sur votre site web.',
          from: 'waiting',
          to: 'ready'
        },
        {
          label: 'Publier',
          ability: this.canPublish,
          alert: 'Une fois publiée, cette ressource apparaîtré sur votre site web.',
          from: 'ready',
          to: 'published' // scheduled
        },
        // {
        //   label: '',
        // alert: '',
        //   from: 'scheduled',
        //   to: ''
        // },
        {
          label: 'Dé-publier',
          ability: this.canPublish,
          alert: 'Attention, cette resource actuellement en ligné, une fois dé-publiée, cette ressource n\'apparaîtra plus sur votre site web.',
          from: 'published',
          to: 'ready'
        }
      ]
    }
  },
  computed: {
    status () {
      const { $props: { record: { status } } } = this
      return status
    },
    actionLabel () {
      const { status, action = [] } = this
      const { label = '' } = action.find(({ from }) => from === status) || {}
      return label
    },
    actionAlert () {
      const { status, action = [] } = this
      const { alert = '' } = action.find(({ from }) => from === status) || {}
      return alert
    },
    actionTo () {
      const { status, action = [] } = this
      const { to = '' } = action.find(({ from }) => from === status) || {}
      return to
    },
    canValidate () {
      const { $auth, $props: { model } } = this
      return $auth.hasScope('manage:all') || $auth.hasScope(`validate:${model.toLowerCase()}s`)
    },
    canPublish () {
      const { $auth, $props: { model } } = this
      return $auth.hasScope('manage:all') || $auth.hasScope(`publish:${model.toLowerCase()}s`)
    }
  },
  methods: {
    select (option) {
      const { $props: { object, itemKey, itemValue, items } } = this
      let val = option
      if (object) {
        const { [itemValue]: objectVal } = items.find(({ [itemKey]: val }) => val === option)
        val = objectVal
      }
      this.close()
      this.$emit('select', val)
    },
    getLabel (value) {
      const { action = [] } = this
      const { label = '' } = action.find(({ from }) => from === value) || {}
      return label
    },
    async updateStatus (status) {
      const { $props: { collection, model, record } } = this
      this.$nuxt.$loading.start()
      this.$emit('loading')
      const { _id } = record
      try {
        await this.$api[model].update(collection, _id, { status })
      } catch (err) {
        console.log(err)
      } finally {
        await this.$api[model].read(collection, _id)
        this.$emit('loaded')
        this.$nuxt.$loading.finish()
        this.close()
      }
    },
    toggle () {
      this.display = !this.display
    },
    close () {
      this.display = false
    }
  }
}
</script>
