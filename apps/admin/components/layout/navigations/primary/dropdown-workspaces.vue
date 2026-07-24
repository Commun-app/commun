<template>
  <div class="relative inline-block text-left">
    <button
      v-if="organizations.length"
      type="button"
      class="flex items-center justify-between rounded-md px-2 text-sm font-medium cursor-pointer text-gray-700 focus:outline-none"
    >
      <div class="inline-flex items-center">
        <avatar-circular
          :place-holder="currentPlaceHolder"
          :media="currentLogo"
          :organization="currentId"
          size="sm"
        />
        <span class="pl-2 text-gray-900" :key="currentPlaceHolder">
          {{ currentPlaceHolder }}
        </span>
      </div>
      <div
        class="ml-4 py-2 px-1 border border-transparent hover:border-gray-200 hover:text-gray-400 text-gray-300 rounded-md cursor-pointer"
        @click="_toggle"
      >
        <svg
          class="h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      </div>
    </button>
    <transition
      enter-active-class="transition ease-out duration-100"
      enter-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="display"
        ref="dropdownOrganizations"
        class="origin-top-left absolute left-0 mt-2 w-80 mx-4 z-50 transform divide-y divide-gray-500 divide-opacity-10 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 transition-all"
      >
        <div class="relative">
          <!-- TODO: replace by search cion -->
          <svg class="pointer-events-none absolute top-3.5 left-4 h-5 w-5 text-gray-900 text-opacity-40" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" />
          </svg>
          <input
            v-model="search"
            type="text"
            class="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm"
            placeholder="Search..."
          >
        </div>

        <!-- Default state, show/hide based on command palette state. -->
        <ul class="max-h-80 scroll-py-2 divide-opacity-10 overflow-y-auto">
          <!-- Active: "bg-gray-900 bg-opacity-5 text-gray-900" -->
          <li v-if="can('manage:all')" class="p-2">
            <!-- Not Active: "text-opacity-40" -->
            <h2 class="my-2 px-3 text-xs font-semibold text-gray-900">
              Management
            </h2>
            <ul class="text-sm text-gray-700">
              <!-- Active: "bg-gray-900 bg-opacity-5 text-gray-900" -->
              <li
                v-for="({ name, icon, route }) in management"
                :key="_id"
                class="group cursor-pointer select-none items-center rounded-md inline-flex px-3 py-2 hover:bg-gray-100"
                @click="_secret(route)"
              >
                <icon :icon="icon" class="w-8 h-8 p-1 text-black rounded-full border border-black" />
                <span class="truncate pl-2 w-56">
                  {{ name }}
                </span>
              </li>
            </ul>
          </li>
          <!-- Active: "bg-gray-900 bg-opacity-5 text-gray-900" -->
          <li v-if="networkOrganizations.length" class="p-2">
            <!-- Not Active: "text-opacity-40" -->
            <h2 class="my-2 px-3 text-xs font-semibold text-gray-900">
              Réseaux
            </h2>
            <ul class="text-sm text-gray-700">
              <!-- Active: "bg-gray-900 bg-opacity-5 text-gray-900" -->
              <li
                v-for="({ name, logo, _id, ...rest }) in networkOrganizations"
                :key="_id"
                class="group cursor-pointer select-none items-center rounded-md inline-flex px-3 py-2 hover:bg-gray-100"
                @click="_select({ name, logo, _id, ...rest })"
              >
                <avatar-circular :place-holder="name" :media="logo" :organization="_id" size="sm" />
                <span class="truncate pl-2 w-56">
                  {{ name }}
                </span>
              </li>
            </ul>
          </li>
          <li v-if="customerOrganizations" class="p-2 border-t border-gray-100">
            <h2 class="my-2 px-3 text-xs font-semibold text-gray-900">
              Clients
            </h2>
            <ul class="text-sm text-gray-700">
              <!-- Active: "bg-gray-900 bg-opacity-5 text-gray-900" -->
              <li
                v-for="({ name, logo, _id, ...rest }) in customerOrganizations"
                :key="_id"
                class="group cursor-pointer select-none items-center rounded-md px-3 py-2 hover:bg-gray-100"
                @click="_select({ name, logo, _id, ...rest })"
              >
                <avatar-circular :place-holder="name" :media="logo" size="sm" />
                <span class="truncate pl-2 w-56">
                  {{ name }}
                </span>
              </li>
            </ul>
          </li>
        </ul>

        <!-- Empty state, show/hide based on command palette state. -->
        <div v-if="!customerOrganizations.length" class="py-14 px-6 text-center sm:px-14">
          <!-- Heroicon name: outline/folder -->
          <svg
            class="mx-auto h-6 w-6 text-gray-900 text-opacity-40"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
          <p class="mt-4 text-sm text-gray-900">
            We couldn't find any projects with that term. Please try again.
          </p>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { onClickOutside } from '@vueuse/core'
import { useWorkspaceStore } from '~/store/layout/workspace'
import avatarCircular from '~/components/elements/avatars/avatar-circular'

const { Organization } = useModels()
const { can } = useAbility()
const $router = useRouter()
const workspaceStore = useWorkspaceStore()

// Prepare reactive data
const search = ref('')
const display = ref(false)
const dropdownOrganizations = ref(null)

// Prepare computed
const management = computed(() => [
  {
    name: 'Organisations',
    route: '/management/organizations',
    icon: 'iconoir:building'
  },
  {
    name: 'Rôles',
    route: '/management/roles',
    icon: 'iconamoon:lock-light'
  },
  {
    name: 'Membres',
    route: '/management/members',
    icon: 'iconoir:user'
  }
])
const organizations = computed(() => Organization.repo.all())
const networkOrganizations =  computed(() => organizations.value.filter(({ type }) => type === 'network'))
const customerOrganizations =  computed(() => {
  const customers = organizations.value.filter(
    ({ type, name }) => type === 'customer' && (!search.value || name.includes(search.value))
  )
  return customers
})
const currentPlaceHolder = computed(() => workspaceStore.workspaceName || 'Management')
const currentLogo = computed(() => workspaceStore.workspaceLogo)
const currentId = computed(() => workspaceStore.workspaceId)

// Prepare methods
const _toggle = () => {
  display.value = !display.value
}
const _close = () => {
  display.value = false
}
const _select = async (organizationRecord) => {
  await workspaceStore.updateOrganization(organizationRecord)
  $router.push(`/${workspaceStore.workspaceId}`)
  _close()
}
const _secret = (route = '/') => {
  $router.replace(route)
  _close()
}

// Prepare directives
onClickOutside(dropdownOrganizations, _close)
</script>
