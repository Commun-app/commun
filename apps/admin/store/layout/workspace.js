import { defineStore } from 'pinia'

// Single-tenant : les permissions dérivent du rôle Commun de l'utilisateur.
// `manage:all` est un joker CASL (toute action sur tout sujet).
//
// `redacteur` reprend EXACTEMENT le rôle legacy « Éditeur de contenu », que
// portaient tous les agents des collectivités. La première version n'avait
// retenu que les records : les agents perdaient la publication du site, la
// médiathèque et la lecture des collections — le bouton « Publier » avait donc
// disparu pour tous sauf les comptes admin (signalé par Grigny le 05/08).
const ROLE_PERMISSIONS = {
  admin: ['manage:all'],
  redacteur: [
    'entrance:self',
    'read:organizations',
    'read:collections',
    'read:records',
    'create:records',
    'update:records',
    'delete:records',
    'publish:records',
    'read:media',
    'create:media',
    'update:media',
    'delete:media',
    'read:deployments',
    'create:deployments'
  ]
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
