<template>
  <avatar-circular
    :place-holder="name"
    :media="media"
    :organization="organization"
    size="sm"
  />
</template>

<script setup>
import avatarCircular from '~/components/elements/avatars/avatar-circular'

const $props = defineProps({
  value: {
    type: Object,
    default: () => ({})
  }
})

const organization = computed(() => $props.value._id)
const name = computed(() => $props.value.name)
const media = computed(() => $props.value.logo)
</script>
