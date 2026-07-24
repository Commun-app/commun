<template>
  <div class="min-h-screen">
    <!-- <NuxtLoadingIndicator /> -->
    <primary-navigation />
    <headings-record />
    <main class="py-8 max-w-3xl mx-auto px-4 sm:px-6 lg:max-w-7xl lg:px-8 h-full">
      <section>
        <slot />
      </section>
    </main>
    <form-modal />
    <notifications-list />
  </div>
</template>

<script setup>
import primaryNavigation from '~/components/layout/navigations/primary'
import headingsRecord from '~/components/layout/headings/headings-record'
import formModal from '~/components/forms/layouts/modal'
import notificationsList from '~/components/layout/notifications/notifications-list'
</script>
