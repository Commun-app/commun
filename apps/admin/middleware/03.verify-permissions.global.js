export default defineNuxtRouteMiddleware(async (to) => {
  const { can } = useAbility()

  if (to.meta.permissions?.length) {
    console.log('[midd.] - verifying member permissions')
    if (to.meta.permissions.some((permission) => !can(permission))) {
      return abortNavigation()
    }
    return
  }
})
