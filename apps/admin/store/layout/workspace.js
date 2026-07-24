import { defineStore } from 'pinia'

// Single-tenant : les permissions dérivent du rôle Commun de l'utilisateur.
// `manage:all` est un joker CASL (toute action sur tout sujet).
const ROLE_PERMISSIONS = {
  admin: ['manage:all'],
  redacteur: ['entrance:self', 'read:records', 'create:records', 'update:records', 'delete:records']
}

export const useWorkspaceStore = defineStore('layout/workspace', () => {
  const $auth = useAuth()
  const $models = useModels()
  const $abilities = useAbility()

  // State
  const organization = ref(undefined)

  // Getters
  const workspace = computed(() => organization.value)
  const workspaceId = computed(() => organization.value?._id)
  const workspaceName = computed(() => organization.value?.name)
  const workspacePath = computed(() => organization.value?.path)
  const workspaceLogo = computed(() => organization.value?.logo)
  const workspaceSettings = computed(() => organization.value?.settings)
  const workspaceCollections = computed(() => organization.value?.collections)

  // Actions
  function updateAbilities() {
    // Session tRPC (auth.me) : enveloppe { result: { data: { user } } }.
    const user = $auth.data.value?.result?.data?.user
    $abilities.assignAbilities([
      'entrance:self',
      ...(ROLE_PERMISSIONS[user?.role] ?? [])
    ])
  }

  async function updateOrganization(selectedOrganization) {
    if (selectedOrganization) {
      organization.value = selectedOrganization
      await Promise.all([
        $models.Record.list('labels', organization.value._id, { limit: 100 }),
        $models.Collection.list(),
        updateAbilities()
      ])
    }
  }

  return {
    organization,
    workspace,
    workspaceId,
    workspaceName,
    workspacePath,
    workspaceLogo,
    workspaceSettings,
    workspaceCollections,
    updateOrganization,
    updateAbilities,
  }
})
