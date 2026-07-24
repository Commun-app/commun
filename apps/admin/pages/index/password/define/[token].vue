<template>
  <div class="mt-12 text-center">
    <h2 class="inline-flex mt-6 text-sm font-semibold">
      Votre compte
    </h2>
    <p class="mt-4 font-light text-sm text-gray-600">
      Choisissez votre nom d'affichage et un mot de passe robuste (10 caractères minimum).
    </p>
    <form class="mt-12 space-y-6" @submit.prevent="_setPassword">
      <input-text
        place-holder="Votre nom"
        name="name"
        autocomplete="name"
        :value="name"
        required
        @change="name = $event"
      />
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
        name="password"
        type="password"
        autocomplete="new-password"
        :value="passwordConfirmation"
        required
        @change="passwordConfirmation = $event"
      />
      <button-primary
        type="submit"
        :label="isLoading ? 'Envoie en cours' : 'Confirmer'"
        :disabled="!name || !password || password !== passwordConfirmation"
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
const name = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const isLoading = ref(false)

// Prepare methods
// Acceptation d'invitation Commun : jeton + nom + mot de passe en une étape.
const _setPassword = async () => {
  isLoading.value = true
  try {
    const { token } = $route.params
    await Entrance.acceptInvitation({ token, name: name.value, password: password.value })
    notificationsStore.add({ icon: 'iconoir:password-cursor', type: 'success', title: 'Compte activé, connectez-vous.' })
    $router.push('/')
  } catch (err) {
    console.log(err)
    notificationsStore.add({
      icon: 'iconoir:password-error',
      type: 'warn',
      title: 'Invitation invalide ou mot de passe trop court (10 caractères minimum).'
    })
  } finally {
    isLoading.value = false
  }
}
</script>
