import { useWorkspaceStore } from "~/store/layout/workspace"

// @review: est-ce que c'est encore utile sachant que mtn on est single tenant?
export default defineNuxtRouteMiddleware(async (to) => {
  const { status } = useAuth()
  const { can } = useAbility()

  if (status.value === "authenticated") {
    console.log('[midd.] - set workspace settings', to.params.workspace)
    const $models = useModels()
    const workspaceStore = useWorkspaceStore()

    workspaceStore.updateAbilities()

    // Ensure store workspace is synced
    if (
      (!can('manage:all') && !to.params.workspace)
      || (to.params.workspace && workspaceStore.workspaceId !== to.params.workspace)
    ) {
      // Retrieve workspace from organizations
      const organization = $models.Organization.repo.find(to.params.workspace)
      if (!organization) {
        const defaultOrganization = $models.Organization.repo.where().first()
        await workspaceStore.updateOrganization(defaultOrganization)
        return navigateTo(`/${workspaceStore.workspaceId}`)
      }
      await workspaceStore.updateOrganization(organization)
    }
  }
})
