<template>
  <div class="bg-gray-200">
    <label :for="name" class="block text-2xs font-light tracking-wider text-gray-500 uppercase">
      {{ label }}
    </label>
    <div :class="{ 'mt-1': !!label }" class="relative block w-full">
      InputAvatar
    </div>
  </div>
</template>

<script>
export default {
  name: 'InputAvatar',
  props: {
    label: {
      type: String,
      default: ''
    },
    name: {
      type: String,
      default: 'input'
    },
    value: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      data: ''
    }
  },
  watch: {
    value: {
      immediate: true,
      handler(val) {
        if (this.data !== val) {
          this.data = val
        }
      }
    },
    data: {
      immediate: true,
      handler(val) {
        this.$emit('change', val)
      }
    }
  }
}
</script>
