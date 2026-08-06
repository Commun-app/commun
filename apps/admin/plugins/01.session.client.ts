// Restaure la session AVANT le routage (les middlewares lisent son état) —
// l'équivalent du getSession bloquant de l'ancien nuxt-auth : un aller
// `auth.me` au démarrage quand un token est présent.
export default defineNuxtPlugin(async () => {
  await useSession().restore()
})
