<template>
  <div class="text-right space-y-1">
    <div v-if="inline" class="inline-flex items-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span class="text-gray-500 text-sm">
        Modifié {{ updatedAtFromNow }}, par
      </span>
      <avatar-with-text :user="updatedBy" prefix="@" no-avatar disabled />
    </div>
    <div v-else>
      <avatar-with-text :user="updatedBy" disabled class="space-x-2" />
      <div class="flex items-center justify-end space-x-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-gray-500 text-xs">
          {{ updatedAtFromNow }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { DateTime } from 'luxon'
import avatarWithText from '~/components/elements/avatars/avatar-with-text'

// Prepare props
const $props = defineProps({
  inline: {
    type: Boolean,
    default: false
  },
  value: {
    type: Object,
    default: () => ({})
  }
})

// Prepare computed
const updatedBy = computed(() => $props.value?.updatedBy || {})
const updatedAtFromNow = computed(() => DateTime.fromISO($props.value?.updatedAt).setLocale('fr').toRelative())
</script>
