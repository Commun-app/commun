<template>
  <div v-if="record?.deployment?.vercel?.hook" class="relative">
    <button
      id="options-menu"
      class="inline-flex items-center justify-center border border-transparent rounded-md shadow-sm text-sm text-white hover:bg-white dark:hover:bg-gray-950 hover:text-black focus:outline-none hover:border-black disabled:bg-gray-200 disabled:border-gray-300 disabled:text-gray-400"
      :class="finish ? 'bg-green-400' : 'bg-black'"
      aria-haspopup="true"
      aria-expanded="true"
      @click.prevent="_toggle"
    >
      <icon v-if="finish" icon="iconoir:window-check" class="text-white hover:text-primary h-9 w-9 p-2" />
      <icon v-else-if="deploying" icon="ei:spinner-2" class="animate-spin h-9 w-9 p-1" />
      <icon
        v-else
        icon="iconoir:upload-data-window"
        class="text-white hover:text-primary h-9 w-9 p-2"
      />
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
        ref="buttonPublish"
        class="origin-top-right absolute right-0 p-2 mt-2 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10"
      >
        <div class="py-1 w-44" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
          <p class="text-xs text-gray-500 pb-2 space-y-2">
            Domaine de publication:
            <nuxt-link :to="record.deployment?.url" class="inline-flex items-center space-x-2 text-sm text-black my-1" target="_blank" external>
              <span>{{ record.deployment?.url }}</span>
              <icon
                icon="lucide:external-link"
                class="text-primary h-4 w-4"
              />
            </nuxt-link>
          </p>
          <!-- Publication désactivée : le déclenchement des déploiements est
               porté avec les jobs (tâche 9.10 du chantier Commun). -->
          <p class="mb-2 rounded-md bg-amber-50 border border-amber-200 px-2 py-2 text-xs text-amber-800">
            Publication bientôt disponible (portage en cours).
          </p>
          <button-primary
            :disabled="true"
            :loading="false"
            label="confirmer"
            class="w-full"
            @click="_publish"
          />
          <div v-if="deploying" class="p-2 border border-gray-300 rounded-md mt-2">
            <p class="text-xs text-gray-400">
              Patientez 2 à 5 minutes pour que votre site soit publié...
            </p>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { onClickOutside, useIntervalFn } from '@vueuse/core'
import { Icon } from '@iconify/vue'
import { useNotificationsStore } from '~/store/layout/notifications'
import { useWorkspaceStore } from '~/store/layout/workspace'
import buttonPrimary from '~/components/elements/buttons/primary'

// Prepare reactive data
const buttonPublish = ref(null)
const display = ref(false)
const loading = ref(true)
const deploying = ref(false)
const finish = ref(false)

// Prepare composables
const { Organization } = useModels()
const { pause, resume, isActive } = useIntervalFn(
  async() => {
    loading.value = true
    const deploymentState = await Organization.getDeployment()
    deploying.value = deploymentState.state !== 'READY'
    loading.value = false
  },
  10000,
  { immediate: true, immediateCallback: true }
)
const $workspaceStore = useWorkspaceStore()
const notificationsStore = useNotificationsStore()

// Prepare computed
const record = computed(() => $workspaceStore.workspace)

// Prepare methods
const _toggle = () => {
  if (display.value) {
    _close()
  } else {
    _open()
  }
}

const _open = () => {
  display.value = true
  resume()
}

const _close = () => {
  display.value = false
  if (!deploying.value) {
    pause()
  }
}

const _publish = async (action) => {
  // Stub : createDeployment jette tant que les déploiements ne sont pas
  // portés (tâche 9.10) — le bouton est désactivé dans le template.
  notificationsStore.add({ icon: 'iconoir:reload-window', type: 'warn', title: 'Publication bientôt disponible.' })
}

// Prepare watch
watch(deploying, async (after, before) => {
  if (before === true && after === false) {
    notificationsStore.add({ icon: 'iconoir:window-check', type: 'success', title: 'Déploiement terminé' })
    finish.value = true
    setTimeout(() => { finish.value = false }, 6000)
  } else if (before === false && after === true) {
    notificationsStore.add({ icon: 'iconoir:reload-window', type: 'default', title: 'Déploiement en cours...' })
  }
})

// Prepare directives
onClickOutside(buttonPublish, _close)
</script>
