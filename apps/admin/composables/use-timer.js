import { useTimestamp } from '@vueuse/core'

// @review: qu'elle est l'utilité de ce truc ? Par ailleurs exporte pas déjà des utils pour la gestion des timeout justement ?  Mais il faudrait verifier si ce truc est vraiment utile
export default (cb, interval, options) => {
  let timer = null
  const { pause: tPause, resume: tResume, timestamp } = useTimestamp({ ...(options || {}), controls: true })
  const startTime = ref(null)

  const remaining = computed(() => {
    if (!startTime.value) {
      return 0
    }
    return interval - (timestamp.value - startTime.value)
  })

  function set (...args) {
    timer = setTimeout(() => {
      timer = null
      startTime.value = null
      cb(...args)
    }, remaining.value)
  }

  function clear () {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function start () {
    startTime.value = Date.now()

    set()
  }

  function stop () {
    clear()
    tPause()
  }

  function pause () {
    clear()
    tPause()
  }

  function resume () {
    set()
    tResume()
    startTime.value = (startTime.value || 0) + (Date.now() - timestamp.value)
  }

  start()

  return {
    start,
    stop,
    pause,
    resume,
    remaining
  }
}
