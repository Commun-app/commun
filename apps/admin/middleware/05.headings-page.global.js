import { useHeadingsStore } from '~/store/layout/headings'

// @review: meme remarque ça me semble overengineered ça, pourquoi c'est pas gérer directement au niveau, des pages ça a un interet ?
export default defineNuxtRouteMiddleware((to, from) => {
  const session = useSession()
  if (session.isAuthenticated.value) {
    console.log('[midd.] - update headings', to.params.collection)
    const headingsStore = useHeadingsStore()
    const { Collection } = useModels()

    // If we are currently on a collection page, we retrieve the headings directly from collection definitions
    if (to.params.collection) {
      const currentCollection = Collection.repo.where('slug', to.params.collection).first()
      // Collection inconnue (ex : URL restaurée vers une collection supprimée) :
      // on renvoie à l'accueil du workspace plutôt que de planter l'app.
      if (!currentCollection) {
        return navigateTo('/overview')
      }
      Object.assign(to.meta, { headings: currentCollection.headings })
    }

    // Parse page meta headings
    headingsStore.updateHeadings({ ...(to.meta.headings || {}) })
  }
})
