<template>
  <div class="mt-12 text-center">
    <h2 class="inline-flex mt-6 text-sm font-semibold">
      Nouveau mot de passe
    </h2>
    <p class="mt-4 font-light text-sm text-gray-600">
      Choisissez un mot de passe robuste (10 caractères minimum).
    </p>
    <form class="mt-12 space-y-6" @submit.prevent="_updatePassword">
      <input-text
        place-holder="Mot de passe"
        name="password"
        type="password"
        autocomplete="new-password"
        :value="password"
        required
        @change="password = $event"
      />
      <input-text
        place-holder="Confirmation"
        name="password-confirmation"
        type="password"
        autocomplete="new-password"
        :value="passwordConfirmation"
        required
        @change="passwordConfirmation = $event"
      />
      <button-primary
        type="submit"
        :label="isLoading ? 'Envoie en cours' : 'Confirmer'"
        :disabled="!password || password !== passwordConfirmation"
        :loading="isLoading"
        class="w-full"
      />
    </form>
  </div>
</template>

<script setup>
import { useNotificationsStore } from '~/store/layout/notifications'
import InputText from '~/components/forms/inputs/input-text'
import ButtonPrimary from '~/components/elements/buttons/primary'

// Prepare composables
const notificationsStore = useNotificationsStore()
const $route = useRoute()
const $router = useRouter()
const { Entrance } = useModels()

// Prepare data
const password = ref('')
const passwordConfirmation = ref('')
const isLoading = ref(false)

// Prepare methods
// Cette page ne sert QUE la réinitialisation : le compte existe déjà, son nom
// est conservé côté serveur. L'invitation, elle, a son propre écran (/welcome)
// — c'est le seul parcours qui a un nom d'affichage à demander. Les deux
// partageaient cet écran, et un utilisateur venu du mail « mot de passe
// oublié » se voyait réclamer un nom sous un titre « Votre compte ».
const _updatePassword = async () => {
  isLoading.value = true
  try {
    const { token } = $route.params
    await Entrance.updatePassword({ token, password: password.value })
    notificationsStore.add({ icon: 'iconoir:password-cursor', type: 'success', title: 'Mot de passe mis à jour, connectez-vous.' })
    $router.push('/')
  } catch (err) {
    console.log(err)
    notificationsStore.add({
      icon: 'iconoir:password-error',
      type: 'warn',
      title: 'Lien expiré ou déjà utilisé, ou mot de passe trop court (10 caractères minimum).'
    })
  } finally {
    isLoading.value = false
  }
}
</script>
