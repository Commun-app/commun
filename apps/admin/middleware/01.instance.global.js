import { useWorkspaceStore } from '~/store/layout/workspace'

// Single-tenant (upgrade-admin-nuxt4) : remplace les middlewares
// 01.list-workspaces / 02.set-workspace — plus de résolution par segment de
// route, l'instance EST l'organisation. Charge la collectivité une fois
// après authentification et pose les permissions du rôle.
export default defineNuxtRouteMiddleware(async () => {
  const session = useSession()
  if (!session.isAuthenticated.value) return

  const workspaceStore = useWorkspaceStore()
  workspaceStore.updateAbilities()

  if (!workspaceStore.workspaceId) {
    const $models = useModels()
    if (!$models.Organization.repo.all().length) {
      await $models.Organization.list()
    }
    await workspaceStore.updateOrganization($models.Organization.repo.where().first())
  }
})
