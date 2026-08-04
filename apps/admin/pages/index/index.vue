<template>
  <div class="mt-12">
    <form class="space-y-6" form @submit.prevent="_signIn">
      <input-text
        place-holder="Adresse email"
        name="email"
        type="email"
        autocomplete="email"
        :value="emailAddress"
        :read-only="isLoading"
        required
        @change="emailAddress = $event"
      />
      <input-text
        place-holder="Mot de passe"
        name="password"
        type="password"
        autocomplete="current-password"
        :value="password"
        :read-only="isLoading"
        required
        @change="password = $event"
      />
      <button-primary type="submit" label="S'identifier" :loading="isLoading" class="w-full" />
    </form>
    <!-- Le lien de réinitialisation était commenté depuis le legacy, qui
         n'envoyait AUCUN email : le seul recours était le formulaire de
         support. L'événement `passwordResetRequested` étant désormais relayé
         vers un fournisseur d'emails, le parcours autonome reprend sa place —
         et Fillout redevient ce qu'il doit être, un second recours. -->
    <div class="flex mt-8 flex-col items-center justify-center">
      <button-tertiary
        label="Vous avez oublié votre mot de passe ?"
        @click="$router.push({ path: '/password/recover' })"
      />
      <button-tertiary class="h-10" label="Je n'arrive pas à m'identifier" @click="_openForm()" />
    </div>
  </div>
</template>

<script setup>
import { useNotificationsStore } from '~/store/layout/notifications'
import InputText from '~/components/forms/inputs/input-text'
import ButtonPrimary from '~/components/elements/buttons/primary'
import ButtonTertiary from '~/components/elements/buttons/tertiary'

// Prepare composables
const notificationsStore = useNotificationsStore()
const { signIn } = useAuth()

// Prepare reactive data
const isLoading = ref(false)
const emailAddress = ref('')
const password = ref('')

// Prepare emitters
defineEmits(['enter'])

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
const _signIn = async () => {
  isLoading.value = true
  try {
    // Payload iso procédure tRPC auth.login : { email, password }.
    await signIn({ email: emailAddress.value, password: password.value }, { callbackUrl: '/overview' })
    notificationsStore.add({ icon: 'iconoir:password-pass', type: 'success', title: 'Authentification réussie.' })
  } catch (err) {
    console.log(err)
    notificationsStore.add({ icon: 'iconoir:password-error', type: 'warn', title: 'Identifiants incorrects.' })
  } finally {
    isLoading.value = false
  }
}
</script>
