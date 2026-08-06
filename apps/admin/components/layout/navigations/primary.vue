<template>
  <header class="border-b border-gray-200 relative">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:max-w-7xl lg:px-8">
      <div class="py-5 flex items-center justify-between">
        <!-- Single-tenant : identité de la collectivité, sans sélecteur. -->
        <nuxt-link to="/overview" class="flex items-center space-x-3">
          <avatar-circular :place-holder="workspaceStore.workspaceName || 'C'" :media="workspaceStore.workspaceLogo" size="sm" />
          <span class="font-medium">{{ workspaceStore.workspaceName }}</span>
        </nuxt-link>
        <div class="flex flex-row items-center justify-center space-x-2">
          <dropdown-publish v-if="displayPublishButton" class="h-10" />
          <button-secondary class="h-10" icon="lucide:message-circle-question" @click="_openForm()" />
          <button-secondary class="h-10" label="Se déconnecter" @click="_logout()" />
        </div>
      </div>
    </div>
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:max-w-7xl lg:px-8">
      <div class="hidden sm:block">
        <nav class="-mb-px flex space-x-8 text-gray-500 font-light whitespace-nowrap tracking-wide text-sm" aria-label="Tabs">
          <nuxt-link
            v-for="({ title, route }) in navigationItems"
            :key="route"
            :to="route"
            active-class="text-gray-900 border-b-2 border-gray-900 font-normal"
            class="hover:text-gray-900 hover:font-normal border-transparent py-4 px-1"
          >
            {{ title }}
          </nuxt-link>
        </nav>
      </div>
      <p v-if="demoEnv" class="absolute bg-black rounded-b-lg text-white px-4 text-xs py-0.5">
        beta
      </p>
    </div>
  </header>
</template>

<script setup>
import { useWorkspaceStore } from '~/store/layout/workspace'
import avatarCircular from '~/components/elements/avatars/avatar-circular'
import buttonSecondary from '~/components/elements/buttons/secondary'
import dropdownPublish from '~/components/layout/navigations/primary/dropdown-publish'
// import mobileButton from '~/components/template/navigation-section/mobile-section/Button'
// import mobileMenu from '~/components/template/navigation-section/mobile-section/Menu'
// import profileDropdown from '~/components/template/navigation-section/ProfileDropdown'

const session = useSession()
const { Collection } = useModels()
const $ability = useAbility()
const $router = useRouter()
const $route = useRoute()
const $config = useRuntimeConfig()

const workspaceStore = useWorkspaceStore()

// Prepare constants
// Single-tenant : les écrans Organisations et Rôles n'ont plus d'objet
// (une seule collectivité, rôles figés admin/rédacteur) — retirés de la nav.
const DEFAULT_NAV_ITEMS = [
  {
    title: 'Accueil',
    route: '/overview',
    permission: 'manage:all'
  },
  {
    title: 'Membres',
    route: '/management/members',
    permission: 'manage:all'
  }
]
const WORKSPACE_NAV_ITEMS = [
  {
    title: 'Accueil',
    route: '/overview',
    permission: ''
  },
  {
    title: 'Paramètres',
    route: '/settings',
    permission: 'admin:organization'
  }
]

// Prepare computed data
const displayPublishButton = computed(() => !!workspaceStore.workspaceId
  && ($ability.can('manage:all')
  || $ability.can('admin:organization')
  || $ability.can('create:deployments'))
)
const navigationItems = computed(() => {
  const items = []
  // Display sub nav if necessary
  if (workspaceStore.workspaceId) {
    const [overview, ...subItemsRest] = WORKSPACE_NAV_ITEMS
    const collections = Collection.repo.find(workspaceStore.workspaceCollections)
    items.push(
      // Single-tenant : les routes vivent à la racine, sans slug d'organisation.
      ...[overview],
      ...collections.map(({ name, slug }) => ({ title: name, route: `/${slug}` })),
      ...subItemsRest
    )
  } else {
    items.push(...DEFAULT_NAV_ITEMS)
  }
  // Filter on user permissions
  return items.filter(({ permission }) => !permission || $ability.can(permission))
})
// L'image d'instance est COMMUNE à tous les clients : rien de spécifique n'y est
// cuit. L'hôte servi est donc la seule source fiable pour distinguer une démo.
const demoEnv = computed(() => {
  const host = import.meta.client ? window.location.host : ''
  return host.includes('.beta') || host.includes('localhost')
})

// Prepare methods
const _openForm = () => {
  // https://forms.fillout.com/t/vjkLG9ZXsLus
  const formUrl = 'https://forms.fillout.com/t/vjkLG9ZXsLus'
  const formWindow = window.open(formUrl, '_blank')
  if (formWindow) {
    // Browser has allowed it to be opened
    formWindow.focus()
  } else {
    // Browser has blocked it
    alert('Please allow popups for this website')
  }
}
const _logout = async () => {
  await session.logout()
  $router.replace('/')
}
</script>
