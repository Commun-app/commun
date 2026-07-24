<template>
  <div class="fixed bottom-10 right-10 max-w-sm z-[55]">
    <div v-if="notificationsStore.notifications.length" class="relative overflow-hidden space-y-2">
      <notifications-default
        v-for="notification of notificationsStore.notifications"
        :key="notification.id"
        v-bind="notification"
        @close="notificationsStore.close(notification.id)"
      />
    </div>
  </div>
</template>

<script setup>
import { useNotificationsStore } from '~/store/layout/notifications'
import notificationsDefault from '~/components/elements/notifications/default'

const notificationsStore = useNotificationsStore()
</script>