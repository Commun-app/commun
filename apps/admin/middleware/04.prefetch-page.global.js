// @review: c'est quoi le prefetch ? Ca me semble overengineered ça, pourquoi on gère pas ça dans le useAsyncData de nuxt js plutot ?
export default defineNuxtRouteMiddleware(async (to) => {
  const { status } = useAuth()
  const $models = useModels()

  if (status.value === 'authenticated' && to.meta.preFetch?.length) {
    console.log('[midd.] - prefetch page', to.params.collection, to.params.record)
    if (to.params.record && to.params.record !== 'new') {
      const [model] = to.meta.preFetch
      await $models[model].read(to.params.record, to.params.collection)
      return
    }
    // Use collection name in case of collection's records pages
    await Promise.all(
      to.meta.preFetch.map(model => $models[model].list(to.params.collection, undefined, { limit: 50 }))
    )
  }
})
