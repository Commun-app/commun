<template>
  <div
    class="inline-flex items-center justify-start rounded-md hover:bg-gray-100 p-1"
    @click="$emitters('click')"
  >
    <avatar-circular
      v-if="!noAvatar"
      :size="'xs'"
      :place-holder="fullName"
      :media="avatar"
    />
    <div class="text-sm truncate">
      {{ prefix }}{{ fullName }}
    </div>
  </div>
</template>

<script setup>
import avatarCircular from '~/components/elements/avatars/avatar-circular'

// Prepare emitters
const $emitters = defineEmits(['click'])

// Prepare props
const $props = defineProps({
  prefix: {
    type: String,
    default: ''
  },
  noAvatar: {
    type: Boolean,
    default: false
  },
  user: {
    type: Object,
    default: () => ({})
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

// Prepare computed
const fullName = computed(() => [$props.user?.firstName, $props.user?.lastName].join(' '))
const avatar = computed(() => $props.user?.avatar)
</script>
