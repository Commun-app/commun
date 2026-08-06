// Restores the session BEFORE routing (the guard reads its state): one
// blocking auth.me on boot when a token is present.
export default defineNuxtPlugin(async () => {
  await useSession().restore()
})
