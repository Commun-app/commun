<template>
  <div class="mt-12 text-center">
    <h2 class="inline-flex mt-6 text-sm font-semibold">
      {{ title }}
    </h2>
    <p class="mt-4 font-light text-sm text-gray-600">
      {{ message }}
    </p>
    <p class="mt-6 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
      Bientôt disponible — en attendant, demandez à un administrateur de vous
      renvoyer une invitation.
    </p>
    <form v-if="!isSent" class="mt-12 space-y-6" @submit.prevent="_recoverPassword">
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
      <button-primary
        type="submit"
        :label="isLoading ? 'Envoie en cours' : 'Continuer'"
        :disabled="true"
        :loading="isLoading"
        class="w-full"
      />
    </form>
    <button-primary
      v-if="isSent"
      label="← Revenir à l'espace de connexion"
      class="w-full mt-8"
      @click="$router.push('/')"
    />
  </div>
</template>

<script setup>
import { useNotificationsStore } from '~/store/layout/notifications'
import InputText from '~/components/forms/inputs/input-text'
import ButtonPrimary from '~/components/elements/buttons/primary'

// Prepare composables
const notificationsStore = useNotificationsStore()
const { Entrance } = useModels()

// Prepare data
const isLoading = ref(false)
const isSent = ref(false)
const emailAddress = ref('')

// Prepare computed
const title = computed(() => {
  return isSent.value ? 'Le mail est parti' : 'Réinitialiser votre mot de passe'
})
const message = computed(() => {
  return isSent.value ? 'N\'hésitez pas à vérifier vos courriers indesirables.' : 'Entrez votre adresse email et nous vous enverrons un lien pour mettre à jour votre mot de passe.'
})

// Prepare methods
const _recoverPassword = async () => {
  isLoading.value = true
  try {
    await Entrance.recoverPassword(emailAddress.value)
    notificationsStore.add({ icon: 'iconoir:mail-out', type: 'success', title: 'Email envoyé.' })
    isSent.value = true
  } catch (err) {
    console.log(err) // eslint-disable-line
  } finally {
    setTimeout(() => { isLoading.value = false }, 2 * 1000)
  }
}
</script>
