import { defineStore } from 'pinia'

export const useNotificationsStore = defineStore('layout/notifications', () => {
  // State
  const _notifications = ref([])

  // Getters
  const notifications = computed(() => _notifications.value)

  // Actions
  /**
   * Adds a notification to the notifications array.
   *
   * @param {Object} notification - The notification object to add.
   * @param {string} notification.title - The title of the notification.
   * @param {string} notification.type - The type of notification (warning / error / info / default)
   * @param {string} [notification.description] - Optional description of the notification.
   * @param {string} [notification.icon] - Optional icon for the notification.
   * @param {Boolean} [notification.closeButton] - Optional close button for the notification.
   * @param {number} notification.timeout - The timeout duration for the notification.
   * @param {Function} [notification.callback] - Optional callback function for the notification.
   * @param {string} [notification.color] - Optional color for the notification.
   *
   * @returns {Object} - The added notification object.
   */
  function add(notification) {
    console.log('[NOTIFICATION] - add', notification)
    Object.assign(notification, { id: new Date().getTime().toString() })

    const index = notifications.value.findIndex((n) => n.id === notification.id)
    if (index === -1) {
      notifications.value.push(notification)
    }

    return notification
  }

  function close (id) {
    console.log('[NOTIFICATION] - close')
    const index = notifications.value.findIndex((n) => n.id === id)
    if (index >= 0) {
      notifications.value.splice(index, 1)
    }
  }

  return {
    notifications,
    add,
    close,
  }
})

