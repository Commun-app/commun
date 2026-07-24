<template>
  <div class="h-5 w-5 rounded-full max-w-xs" :style="`background-color: ${value}`" @click="$emit('click')">
    &#8203;
  </div>
</template>

<script>
export default {
  name: 'DataColor',
  props: {
    value: {
      type: String,
      default: ''
    }
  }
}
</script>
