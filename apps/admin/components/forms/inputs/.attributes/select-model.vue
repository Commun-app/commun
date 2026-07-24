<template>
  <div v-if="!loading">
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
        :class="{ 'ring-gray-50 border-gray-900':display }"
        class="relative w-full bg-white rounded-md pl-3 pr-10 py-2 h-10 text-left cursor-pointer shadow-xs border border-gray-200 focus:outline-none focus:ring-gray-50 focus:border-black hover:border-black text-sm"
        @click="toggle"
      >
        <span :class="{ 'text-gray-700':!selectionText }" class="block truncate">
          {{ selectionText || placeHolder }}
        </span>
        <span class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </span>
      </button>
      <transition
        leave-active-class="transition ease-in duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="display"
          v-click-outside="close"
          class="absolute mt-1 w-full rounded-md bg-white shadow-lg z-50"
        >
          <ul
            abindex="-1"
            role="listbox"
            aria-labelledby="listbox-label"
            aria-activedescendant="listbox-item-3"
            class="max-h-60 rounded-md py-2 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
          >
            <div v-if="groupBy">
              <div v-for="({ name, children }, i) in options" :key="i" class="p-2 space-y-1">
                <div class="border-b border-gray-200">
                  <p class="pb-4 pl-4 pr-4 text-gray-500 font-light uppercase text-xs">
                    {{ name }}
                  </p>
                </div>
                <li
                  v-for="(option, j) in children"
                  :key="`${name}-${j}`"
                  :class="{ 'bg-gray-100': isSelected(option) }"
                  class="cursor-pointer select-none relative rounded-md py-2 pl-4 pr-4 text-gray-900 hover:bg-gray-100"
                  @click="select(option)"
                >
                  <span :class="{ 'font-semibold':isSelected(option) }" class="font-normal block truncate">
                    {{ option }}
                  </span>
                  <span
                    v-show="isSelected(option)"
                    class="absolute text-gray-900 inset-y-0 right-0 flex items-center pr-4"
                  >
                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                  </span>
                </li>
              </div>
            </div>
            <li
              v-for="({ name }) in options"
              :key="name"
              :class="{ 'bg-gray-100': isSelected(name) }"
              class="cursor-pointer select-none relative rounded-md py-2 pl-4 pr-4 text-gray-900 hover:bg-gray-100"
              @click="select(name)"
            >
              <span :class="{ 'font-semibold':isSelected(name) }" class="font-normal block truncate">
                {{ name }}
              </span>
              <span
                v-show="isSelected(name)"
                class="absolute text-gray-900 inset-y-0 right-0 flex items-center pr-4"
              >
                <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </span>
            </li>
          </ul>
        </div>
      </transition>
    </div>
  </div>
</template>

<script>
import { directive } from 'v-click-outside'

export default {
  name: 'SelectModel',
  directives: {
    clickOutside: directive
  },
  props: {
    filter: {
      type: Function,
      default: () => () => true
    },
    groupBy: {
      type: String,
      default: ''
    },
    model: {
      type: String,
      default: 'Label'
    },
    itemKey: {
      type: String,
      default: 'name'
    },
    itemValue: {
      type: String,
      default: '_id'
    },
    label: {
      type: String,
      default: ''
    },
    enableMultiple: {
      type: Boolean,
      default: false
    },
    placeHolder: {
      type: String,
      default: ''
    },
    value: {
      type: [String, Array],
      default: ''
    }
  },
  data () {
    return {
      loading: true,
      display: false,
      selection: ''
    }
  },
  computed: {
    models () {
      const { $props: { model } } = this
      return this.$api[model].all()
    },
    options () {
      const { $props: { groupBy, filter }, models = [] } = this
      if (groupBy) {
        return models
          .filter(filter)
          .filter(({ [groupBy]: groupedProperty }) => groupBy && groupedProperty)
          .map(({ [groupBy]: groupedProperty, ...rest }) => {
            const children = models
              .filter(filter)
              .filter(({ [groupBy]: groupCheck }) => groupBy && groupCheck === groupedProperty)

            const option = {
              children,
              ...rest
            }
            if (groupBy) {
              Object.assign(option, { [groupBy]: groupedProperty })
            }
            return option
          })
      }
      return models.filter(filter)
    },
    selectionText () {
      const { $props: { enableMultiple }, models = [], selection } = this
      if (selection) {
        if (enableMultiple) {
          return selection
            .map(_id => models.find(({ _id: check }) => check === _id))
            .map(({ name }) => name)
            .join(', ')
        }
        const { name } = models.find(({ _id }) => selection === _id)
        return name
      }
      return ''
    }
  },
  watch: {
    value: {
      immediate: true,
      handler (val) {
        const { $props: { enableMultiple }, selection } = this
        if (!val || !val.length) {
          this.selection = enableMultiple ? [] : ''
        }
        if (val && val.length && val !== selection) {
          if (enableMultiple) {
            this.selection = val.every(el => typeof el === 'object')
              ? val.map(({ _id: value }) => value)
              : [...val]
          } else {
            this.selection = typeof val === 'object'
              ? val._id
              : val
          }
        }
        this.$emit('change', this.selection)
      }
    }
  },
  async mounted () {
    const { $props: { model }, models } = this
    if (!models.length) {
      await this.$api[model].list()
    }
    this.loading = false
  },
  methods: {
    isSelected (option) {
      const { $props: { enableMultiple }, models, selection } = this
      const { _id } = models.find(({ name }) => name === option)
      if (enableMultiple) {
        return selection.includes(_id)
      }
      return selection === _id
    },
    select (option) {
      const { $props: { enableMultiple }, models } = this
      const { _id } = models.find(({ name }) => name === option)
      if (enableMultiple) {
        const index = this.selection.indexOf(_id)
        index >= 0 ? this.selection.splice(index, 1) : this.selection.push(_id)
      } else {
        this.selection = _id
        this.close()
      }
      this.$emit('change', this.selection)
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
