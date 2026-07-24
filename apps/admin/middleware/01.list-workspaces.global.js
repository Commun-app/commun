// @review: est-ce que c'est encore utile sachant que mtn on est single tenant?
// D'ailleurs cette méthode list organizations fait elle encore du sens ?
export default defineNuxtRouteMiddleware(async () => {
  const { status } = useAuth()
  if (status.value === 'authenticated') {
    console.log('[midd.] - list member workspaces')
    const $models = useModels()

    const organizations = $models.Organization.repo.all()
    if (!organizations.length) {
      await $models.Organization.list()
    }
  }
})
