<template>
  <div class="min-w-screen min-h-screen">
    <slot />
    <notifications-list />
  </div>
</template>

<script setup>
import notificationsList from '~/components/layout/notifications/notifications-list'
</script>