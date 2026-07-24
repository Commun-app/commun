<template>
  <div class="mt-12 text-center">
    <h2 class="inline-flex mt-6 text-sm font-semibold">
      Bienvenue !
    </h2>
    <p class="mt-4 font-light text-sm text-gray-600">
      Vous avez été invité·e à rejoindre l'espace d'administration.
      Continuez pour choisir votre nom d'affichage et votre mot de passe.
    </p>
    <button-primary
      label="Créer mon compte"
      class="mt-4"
      @click="_setPassword"
    />
  </div>
</template>

<script setup>
import ButtonPrimary from '~/components/elements/buttons/primary'

// Flux invitation Commun : la validité du jeton est vérifiée au moment de
// l'acceptation (auth.acceptInvitation) — plus d'étape « confirmation
// d'email » préalable comme dans le legacy.
const $route = useRoute()
const $router = useRouter()

const _setPassword = () => {
  $router.push(`/password/define/${$route.params.token}`)
}
</script>
